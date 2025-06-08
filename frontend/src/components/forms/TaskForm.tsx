import React, { useState, useEffect, useCallback, useImperativeHandle } from 'react';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, UsersIcon, AlertTriangle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Task, TaskStatus, projectService, userService, teamService } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { useCreateTask, useUpdateTask } from '@/services/backend/tasks';

import { debounce } from 'lodash'; // Importar a função debounce

// Schema de validação para o formulário
const taskFormSchema = z.object({
  title: z.string().min(3, {
    message: "O título deve ter pelo menos 3 caracteres.",
  }),
  description: z.string().optional(),
  status: z.enum(['pendente', 'a_fazer', 'em_andamento', 'em_revisao', 'concluido'] as const, {
    required_error: "Por favor selecione um status.",
  }),
  priority: z.enum(['baixa', 'media', 'alta', 'urgente'] as const, {
    required_error: "Por favor selecione uma prioridade.",
  }),
  start_date: z.date().optional(),
  due_date: z.date().optional(),
  project_id: z.number().optional(),
  user_ids: z.array(z.number()).optional(),
  occupation_ids: z.array(z.number()).optional(),
  order: z.number().optional(), // Campo para a ordem da tarefa
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

export interface TaskFormProps {
  initialData?: Task;
  onSuccess: (data: Partial<Task>) => void;
  defaultProjectId?: number;
  defaultStatus?: TaskStatus;
  projectUsers?: any[];
  projectTeams?: any[];
  isEditMode?: boolean; // Indica se o formulário está em modo de edição
  formInstanceId?: string; // Adicionado para rastrear a instância
}

export interface TaskFormRef {
  triggerSubmit: () => void;
}

export const TaskForm = React.forwardRef<TaskFormRef, TaskFormProps>(
  ({ initialData, onSuccess, defaultProjectId, defaultStatus, projectUsers, projectTeams, isEditMode = false, formInstanceId }, ref) => {
    // Log para depuração de status inicial
    useEffect(() => {
      const mountUpdateId = Date.now();
      console.log(`[TaskForm] MOUNT/UPDATE (ID: ${mountUpdateId}). Instance ID Prop: ${formInstanceId}, isEditMode: ${isEditMode}, defaultStatus: ${defaultStatus}, initialData ID: ${initialData?.id}`);
      console.log(`[TaskForm] (ID: ${mountUpdateId}) Props na montagem/atualização (detalhe). isEditMode:`, isEditMode, 'initialData:', initialData);
      console.log(`[TaskForm] (ID: ${mountUpdateId}) Received onSuccess prop definition:`, onSuccess.toString().substring(0, 300) + "...");
    }, [initialData, defaultStatus, isEditMode, formInstanceId, onSuccess]); // Adicionado onSuccess às dependências para logar se ela mudar
  const statusLabels: Record<TaskStatus, string> = {
    pendente: "Pendente",
    a_fazer: "A Fazer",
    em_andamento: "Em Andamento",
    em_revisao: "Em Revisão",
    concluido: "Concluído",
  };

  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const permissions = usePermissions();
  const { mutate: createTaskMutation, isPending: isCreatePending } = useCreateTask();
  const { mutate: updateTaskMutation, isPending: isUpdatePending } = useUpdateTask();
  const isPending = isCreatePending || isUpdatePending;

  // Inicializa o formulário com zod resolver
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      status: initialData?.status || defaultStatus || "a_fazer",
      priority: initialData?.priority || "media",
      start_date: initialData?.start_date ? new Date(initialData.start_date) : undefined,
      due_date: initialData?.due_date ? new Date(initialData.due_date) : undefined,
      project_id: initialData?.project_id || defaultProjectId,
      user_ids: initialData?.users?.map(u => typeof u === 'number' ? u : u.id) || [],
      occupation_ids: initialData?.occupations?.map(o => typeof o === 'number' ? o : o.id) || [],
      order: initialData?.order, // Preservar a ordem da tarefa se existir
    },
  });

  // Função para salvar automaticamente a tarefa
  const handleAutoSave = useCallback(async (values: TaskFormValues) => {
    // Prepara os dados de forma similar ao onSubmit, mas sem lógica de validação de dirty/isEditMode inicial
    const formattedValues = {
      ...values,
      start_date: values.start_date ? values.start_date.toISOString() : undefined,
      due_date: values.due_date ? values.due_date.toISOString() : undefined,
      users: values.user_ids,
      occupations: values.occupation_ids
    };

    let apiValues;

    // Lógica para determinar quais campos salvar com base nas permissões e modo de edição
    if (permissions.isMember && isEditMode) {
        apiValues = {
          status: formattedValues.status,
          description: formattedValues.description
        };
      } else {
        // Salvar todos os campos permitidos via auto-save
        apiValues = {
          title: formattedValues.title,
          description: formattedValues.description,
          status: formattedValues.status,
          priority: formattedValues.priority,
          start_date: formattedValues.start_date,
          due_date: formattedValues.due_date,
          project_id: formattedValues.project_id,
          users: formattedValues.users,
          occupations: formattedValues.occupations,
          // Não salvamos order aqui, pois só muda no kanban drag/drop
        };
      }

    console.log('Salvamento automático debounceado acionado:', apiValues); // Log para debug
    // Chamamos a função de sucesso com os dados a serem salvos
    // É importante que onSuccess no componente pai saiba lidar com chamadas parciais (apenas status/description para membros)
    // O componente pai é responsável por lidar com a chamada API real e o feedback de loading/erro para o auto-save.
    onSuccess(apiValues);

  }, [onSuccess, permissions, isEditMode]); // Dependências do useCallback para handleAutoSave

  // Função debounceada para salvar automaticamente
  const debouncedAutoSave = useCallback(
    debounce((values: TaskFormValues) => {
      // Verificar se a tarefa já tem um ID antes de tentar salvar (evita salvar tarefas novas antes de serem criadas)
      if (initialData?.id) { // Só salva se a tarefa existir (modo de edição)
         handleAutoSave(values);
      }
    }, 1000), // 1000ms = 1 segundo de debounce
    [handleAutoSave, initialData] // Dependências do useCallback para debouncedAutoSave
  );

  // Efeito para observar mudanças no formulário e acionar o debounce
  useEffect(() => {
    // Assinar as mudanças no formulário
    const subscription = form.watch((values, { name, type }) => {
       // Acionar o auto-save debounceado em qualquer mudança no formulário
       // Passamos os valores atuais do formulário para a função debounceada
       debouncedAutoSave(values as TaskFormValues);
    });

    // Função de cleanup
    return () => {
      subscription.unsubscribe(); // Cancelar a observação ao desmontar
      debouncedAutoSave.cancel(); // Cancelar qualquer debounce pendente
    };
  }, [form, debouncedAutoSave]); // Dependências do useEffect

  // Efeito para limpar os estados quando o projeto muda
  useEffect(() => {
    // Limpar os estados anteriores para evitar que dados antigos sejam exibidos
    setUsers([]);
    setFilteredUsers([]);
    setAllUsers([]);
    setTeams([]);
  }, [defaultProjectId]);

  // Inicializar os usuários filtrados com um array vazio para evitar erros
  useEffect(() => {
    if (!filteredUsers || !Array.isArray(filteredUsers)) {
      setFilteredUsers([]);
    }
  }, [filteredUsers]);

  // Função para filtrar usuários com base nas equipes selecionadas
  const filterUsersByTeams = (teamIds: number[]) => {

    // Garantir que allUsers seja um array válido
    if (!Array.isArray(allUsers)) {
      setFilteredUsers([]);
      return;
    }

    if (!teamIds || !teamIds.length) {
      // Se nenhuma equipe for selecionada e temos um projeto padrão, mostrar apenas os usuários do projeto
      if (defaultProjectId && users.length > 0) {
        setFilteredUsers(users);
      } else {
        // Se não temos um projeto padrão, mostrar todos os usuários
        setFilteredUsers(allUsers);
      }
      return;
    }

    // Buscar usuários diretamente das equipes selecionadas
    if (!Array.isArray(teams) || teams.length === 0) {
      setFilteredUsers([]);
      return;
    }

    const selectedTeams = teams.filter(team => teamIds.includes(team.id));

    // Criar um mapa de IDs de usuários para evitar duplicatas
    const userIdMap = new Map();

    // Adicionar usuários das equipes selecionadas
    selectedTeams.forEach(team => {
      if (team.users && Array.isArray(team.users)) {
        team.users.forEach(user => {
          const userId = typeof user === 'number' ? user : user.id;
          const userName = typeof user === 'number' ? `Usuário ${user}` : user.name;
          userIdMap.set(userId, { id: userId, name: userName });
        });
      }
    });

    // Verificar usuários que têm a equipe diretamente associada
    allUsers.forEach(user => {
      // Verificar se o usuário tem equipes múltiplas
      if (user.occupations && Array.isArray(user.occupations)) {
        const hasSelectedTeam = user.occupations.some(occ => {
          const occId = typeof occ === 'number' ? occ : occ.id;
          return teamIds.includes(occId);
        });

        if (hasSelectedTeam) {
          userIdMap.set(user.id, user);
        }
      }

      // Verificar se o usuário tem uma equipe direta
      const userTeamId = user.occupationId || user.occupation_id;
      if (userTeamId && teamIds.includes(userTeamId)) {
        userIdMap.set(user.id, user);
      }

      // Verificar se o usuário tem um objeto de equipe
      if (user.occupation && user.occupation.id && teamIds.includes(user.occupation.id)) {
        userIdMap.set(user.id, user);
      }
    });

    // Converter o mapa de volta para um array
    const filtered = Array.from(userIdMap.values());

    setFilteredUsers(filtered);
  };

  // Carregar dados necessários para o formulário
  useEffect(() => {
    console.log('[useEffect fetchData] Dependências:', {
      defaultProjectId,
      defaultStatus,
      initialDataId: initialData?.id,
    });
    const fetchData = async () => {
      setLoading(true);
      try {
        // Carregar projetos
        const projectsData = await projectService.getProjects();
        setProjects(projectsData);

        // Carregar todos os usuários para ter uma lista completa
        const usersData = await userService.getUsers();
        setAllUsers(usersData || []);

        // Inicializar os usuários filtrados com um array vazio
        setFilteredUsers([]);

        // Se estamos dentro de um projeto e temos usuários e equipes do projeto
        if (projectUsers && projectUsers.length > 0) {
          // Garantir que os usuários tenham todas as propriedades necessárias
          const formattedUsers = projectUsers.map(user => {
            // Se o usuário for apenas um ID, buscar os detalhes completos
            if (typeof user === 'number') {
              return { id: user, name: `Usuário ${user}` };
            }
            return user;
          });
          setUsers(formattedUsers);
          setFilteredUsers(formattedUsers); // Inicializar os usuários filtrados
        } else if (defaultProjectId) {
          // Se temos um projeto padrão mas não temos usuários, tentar buscar os usuários do projeto
          try {
            const projectData = await projectService.getProject(defaultProjectId);
            if (projectData.users && Array.isArray(projectData.users)) {
              const projectUsersList = projectData.users.map(user => {
                if (typeof user === 'number') {
                  return { id: user, name: `Usuário ${user}` };
                }
                return user;
              });
              setUsers(projectUsersList);
              setFilteredUsers(projectUsersList); // Inicializar os usuários filtrados
            } else {
              // Se não encontrou usuários no projeto, usar todos os usuários
              setUsers(usersData);
              // Inicializar com array vazio para forçar o usuário a selecionar equipes primeiro
              setFilteredUsers([]);
            }
          } catch (error) {
            console.error('Erro ao buscar usuários do projeto:', error);
            // Em caso de erro, usar todos os usuários
            setUsers(usersData);
            // Inicializar com array vazio para forçar o usuário a selecionar equipes primeiro
            setFilteredUsers([]);
          }
        } else {
          // Se não estamos em um projeto específico, usar todos os usuários
          setUsers(usersData);

          // Se não há equipes selecionadas, inicializar com array vazio para forçar o usuário a selecionar equipes primeiro
          setFilteredUsers([]);
        }

        // Se estamos em modo de edição e a tarefa tem um projeto associado
        if (isEditMode && initialData?.project_id) {
          try {
            // Buscar diretamente as equipes do projeto
            const projectOccupations = await projectService.getProjectOccupations(initialData.project_id);

            if (projectOccupations && projectOccupations.length > 0) {
              setTeams(projectOccupations);
            } else {

              // Se não encontrou equipes, tentar buscar o projeto completo
              const projectData = await projectService.getProject(initialData.project_id);

              if (projectData.occupations && Array.isArray(projectData.occupations) && projectData.occupations.length > 0) {
                const projectTeamsList = projectData.occupations.map(team => {
                  if (typeof team === 'number') {
                    return { id: team, name: `Equipe ${team}` };
                  }
                  return team;
                });

                setTeams(projectTeamsList);
              } else {
                // Se ainda não encontrou equipes, verificar se a tarefa tem equipes associadas
                if (initialData.occupations && Array.isArray(initialData.occupations) && initialData.occupations.length > 0) {
                  // Buscar todas as equipes para poder filtrar
                  const allTeamsData = await teamService.getTeams();

                  // Extrair IDs das equipes da tarefa
                  const taskOccupationIds = initialData.occupations.map(occ =>
                    typeof occ === 'number' ? occ : occ.id
                  );

                  // Filtrar apenas as equipes associadas à tarefa
                  const taskTeams = allTeamsData.filter(team =>
                    taskOccupationIds.includes(team.id)
                  );

                  if (taskTeams.length > 0) {
                    setTeams(taskTeams);
                  } else {
                    // Buscar o projeto para obter suas equipes
                    const projectData = await projectService.getProject(initialData.project_id);
                    if (projectData.occupations && Array.isArray(projectData.occupations) && projectData.occupations.length > 0) {
                      setTeams(projectData.occupations);
                    } else {
                      // Se o projeto não tem equipes, mostrar lista vazia
                      setTeams([]);
                    }
                  }
                } else {
                  // Buscar o projeto para obter suas equipes
                  const projectData = await projectService.getProject(initialData.project_id);
                  if (projectData.occupations && Array.isArray(projectData.occupations) && projectData.occupations.length > 0) {
                    setTeams(projectData.occupations);
                  } else {
                    // Se o projeto não tem equipes, mostrar lista vazia
                    setTeams([]);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Erro ao buscar equipes do projeto no modo de edição:', error);
            // Em caso de erro, mostrar lista vazia de equipes
            setTeams([]);
          }
        }
        // Se estamos dentro de um projeto e temos equipes do projeto (não em modo de edição)
        else if (projectTeams && projectTeams.length > 0) {
          // Garantir que as equipes tenham todas as propriedades necessárias
          const formattedTeams = projectTeams.map(team => {
            // Se a equipe for apenas um ID, buscar os detalhes completos
            if (typeof team === 'number') {
              return { id: team, name: `Equipe ${team}` };
            }
            return team;
          });
          setTeams(formattedTeams);
        }
        // Se temos um projeto padrão (não em modo de edição)
        else if (defaultProjectId) {
          // Se temos um projeto padrão, tentar buscar as equipes do projeto
          try {
            const projectOccupations = await projectService.getProjectOccupations(defaultProjectId);

            if (projectOccupations && projectOccupations.length > 0) {
              setTeams(projectOccupations);
            } else {
              // Se não encontrou equipes, buscar o projeto completo
              const projectData = await projectService.getProject(defaultProjectId);

              if (projectData.occupations && Array.isArray(projectData.occupations)) {
                const projectTeamsList = projectData.occupations.map(team => {
                  if (typeof team === 'number') {
                    return { id: team, name: `Equipe ${team}` };
                  }
                  return team;
                });

                setTeams(projectTeamsList);
              } else {
                // Se não encontrou equipes no projeto, carregar todas as equipes
                const teamsData = await teamService.getTeams();
                setTeams(teamsData);
              }
            }
          } catch (error) {
            console.error('Erro ao buscar equipes do projeto:', error);
            // Em caso de erro, carregar todas as equipes
            const teamsData = await teamService.getTeams();
            setTeams(teamsData);
          }
        }
        // Se não temos projeto nem equipes específicas
        else {
          // Carregar todas as equipes
          const teamsData = await teamService.getTeams();
          setTeams(teamsData);
        }

        // Se temos um projeto padrão, pré-selecionar ele no formulário
        if (defaultProjectId) {
          form.setValue('project_id', defaultProjectId);
        }

        // Se temos um status padrão, pré-selecionar ele no formulário
        if (defaultStatus) {
          form.setValue('status', defaultStatus);
        }
      } catch (error) {
        console.error("Erro ao carregar dados para o formulário:", error);
        toast.error("Erro ao carregar dados. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [defaultProjectId, defaultStatus, initialData?.id]);

  // Efeito para filtrar usuários quando as equipes selecionadas mudarem
  useEffect(() => {
    const selectedTeams = form.watch('occupation_ids') || [];

    // Garantir que temos dados válidos antes de filtrar
    if (Array.isArray(teams) && teams.length > 0 && Array.isArray(allUsers)) {
      filterUsersByTeams(selectedTeams);

      // Limpar usuários selecionados que não pertencem às equipes selecionadas
      if (selectedTeams.length > 0) {
        const currentUsers = form.watch('user_ids') || [];
        if (currentUsers.length > 0) {
          // Verificar se os usuários selecionados estão nas equipes selecionadas
          setTimeout(() => {
            if (Array.isArray(filteredUsers)) {
              const validUserIds = filteredUsers.map(u => u.id);
              const validSelectedUsers = currentUsers.filter(userId => validUserIds.includes(userId));

              if (validSelectedUsers.length !== currentUsers.length) {
                form.setValue('user_ids', validSelectedUsers);
              }
            }
          }, 100);
        }
      }
    }
  }, [form.watch('occupation_ids'), teams, allUsers, filteredUsers, form, filterUsersByTeams]);

  // Função para obter as equipes de um usuário
  const getUserTeams = (user: any) => {
    if (!user) return 'Sem equipe';

    let teamNames: string[] = [];

    try {
      // Verificar se o usuário tem ocupações múltiplas
      if (user.occupations && Array.isArray(user.occupations) && user.occupations.length > 0) {
        // Mapear IDs de ocupações para nomes
        teamNames = user.occupations.map((occ: any) => {
          const occId = typeof occ === 'number' ? occ : occ.id;
          const team = teams.find(t => t.id === occId);
          return team ? team.name : `Equipe ${occId}`;
        });
      }

      // Verificar se o usuário tem uma ocupação direta
      const userOccupationId = user.occupationId || user.occupation_id;
      if (userOccupationId && teamNames.length === 0) {
        const team = teams.find(t => t.id === userOccupationId);
        if (team) teamNames.push(team.name);
      }

      // Verificar se o usuário tem um objeto de ocupação
      if (user.occupation && user.occupation.id && teamNames.length === 0) {
        const team = teams.find(t => t.id === user.occupation.id);
        if (team) {
          teamNames.push(team.name);
        } else if (user.occupation.name) {
          teamNames.push(user.occupation.name);
        }
      }

      if (teamNames.length === 0) {
        return 'Sem equipe';
      }

      return teamNames.join(', ');
    } catch (error) {
      console.error('Erro ao obter equipes do usuário:', error);
      return 'Sem equipe';
    }
  };

  const onSubmit = (values: TaskFormValues) => {
    console.log(`[TaskForm.tsx] onSubmit from instance ID: ${formInstanceId}. Modo Edição: ${isEditMode}, Formulário sujo: ${form.formState.isDirty}`);
    console.log('[TaskForm.tsx] Valores recebidos no onSubmit:', values);

    if (!form.formState.isDirty && isEditMode) {
      toast.info("Nenhuma alteração foi feita");
      console.log('[TaskForm.tsx] Nenhuma alteração detectada no modo de edição.');
      return;
    }

    // Converter datas para string no formato ISO
    const formattedValues = {
      ...values,
      start_date: values.start_date ? values.start_date.toISOString() : undefined,
      due_date: values.due_date ? values.due_date.toISOString() : undefined,
      users: values.user_ids,
      occupations: values.occupation_ids
    };

    // Se o usuário for um membro e estiver em modo de edição, permitir apenas atualizar status e comentário
    let apiValues;

    if (permissions.isMember && isEditMode) {
      apiValues = {
        status: formattedValues.status,
        description: formattedValues.description
      };
    } else {
      apiValues = {
        title: formattedValues.title,
        description: formattedValues.description,
        status: formattedValues.status,
        priority: formattedValues.priority,
        start_date: formattedValues.start_date,
        due_date: formattedValues.due_date,
        project_id: formattedValues.project_id,
        users: formattedValues.users,
        occupations: formattedValues.occupations,
        order: values.order
      };
    }

    console.log('[TaskForm.tsx] apiValues preparados para onSuccess:', apiValues);

    if (isEditMode && initialData?.id) {
      updateTaskMutation(
        { id: initialData.id, data: apiValues },
        {
          onSuccess: (data) => {
            onSuccess(data);
          },
          onError: (error) => {
            console.error('[TaskForm.tsx] Erro ao atualizar tarefa:', error);
            toast.error('Erro ao processar formulário. Tente novamente.');
          },
        }
      );
    } else {
      createTaskMutation(apiValues, {
        onSuccess: (data) => {
          onSuccess(data);
        },
        onError: (error) => {
          console.error('[TaskForm.tsx] Erro ao criar tarefa:', error);
          toast.error('Erro ao processar formulário. Tente novamente.');
        },
      });
    }
  };

  // Expor a função de submit via ref
  useImperativeHandle(ref, () => ({
    triggerSubmit: () => {
      form.handleSubmit(onSubmit)();
    }
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input
                  placeholder="Digite o título da tarefa"
                  {...field}
                  disabled={permissions.isMember && isEditMode}
                />
              </FormControl>
              {permissions.isMember && isEditMode && (
                <FormDescription className="text-xs text-muted-foreground mt-1">
                  Como membro, você não pode alterar o título da tarefa.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva a tarefa em detalhes"
                  className="min-h-[100px]"
                  {...field}
                  value={field.value || ""}
                  disabled={permissions.isMember && isEditMode}
                />
              </FormControl>
              {permissions.isMember && isEditMode && (
                <FormDescription className="text-xs text-muted-foreground mt-1">
                  Como membro, você não pode alterar a descrição da tarefa.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={loading || isPending}
                >
                  <FormControl>
                    <SelectTrigger>
                      {/* Exibe o rótulo formatado ou o placeholder */}
                      <SelectValue placeholder="Selecione o status">
                        {field.value ? statusLabels[field.value as TaskStatus] : "Selecione o status"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem> {/* Adicionada opção Pendente */}
                    <SelectItem value="a_fazer">A Fazer</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="em_revisao">Em Revisão</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridade</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={loading || isPending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Início</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={loading || isPending || (permissions.isMember && isEditMode)}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      disabled={loading || isPending}
                    />
                  </PopoverContent>
                </Popover>
                {permissions.isMember && isEditMode && (
                  <FormDescription className="text-xs text-muted-foreground mt-1">
                    Como membro, você não pode alterar a data de início da tarefa.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Prazo</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={loading || isPending || (permissions.isMember && isEditMode)}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      disabled={loading || isPending}
                    />
                  </PopoverContent>
                </Popover>
                {permissions.isMember && isEditMode && (
                  <FormDescription className="text-xs text-muted-foreground mt-1">
                    Como membro, você não pode alterar o prazo da tarefa.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="project_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Projeto</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value && value !== "0" ? parseInt(value) : undefined)}
                  value={field.value?.toString()}
                  disabled={!!isEditMode || !!defaultProjectId || loading || permissions.isMember} // Desabilitar o campo quando estiver em modo de edição, quando tiver um projeto padrão, quando for membro ou carregando
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="0">Sem projeto</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(isEditMode || defaultProjectId || permissions.isMember) && (
                  <FormDescription className="text-xs text-muted-foreground mt-1">
                    {isEditMode
                      ? "O projeto não pode ser alterado durante a edição da tarefa."
                      : permissions.isMember
                        ? "Como membro, você não pode alterar o projeto da tarefa."
                        : "O projeto não pode ser alterado quando a tarefa é criada dentro de um projeto específico."}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="occupation_ids"
            render={() => (
              <FormItem className="h-full">
                <FormLabel>Equipes da Tarefa</FormLabel>
                <Card className="h-[calc(100%-2rem)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="h-4 w-4" />
                        Adicionar Equipes à Tarefa
                      </div>
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      Selecione as equipes que participarão desta tarefa.
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-2 max-h-[200px] overflow-y-auto">
                    {teams.length > 0 ? (
                      teams.map((team) => (
                        <div key={team.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={form.watch('occupation_ids')?.includes(team.id)}
                            onCheckedChange={(checked) => {
                              const currentTeams = form.watch('occupation_ids') || [];
                              const newTeams = checked
                                ? [...currentTeams, team.id]
                                : currentTeams.filter(id => id !== team.id);
                              form.setValue('occupation_ids', newTeams);

                              // Filtrar usuários com base nas equipes selecionadas
                              filterUsersByTeams(newTeams);
                            }}
                            disabled={loading || isPending || (permissions.isMember && isEditMode)}
                          />
                          <label className="text-sm font-medium leading-none">
                            {team.name}
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma equipe encontrada.
                      </p>
                    )}
                  </CardContent>
                </Card>
                {permissions.isMember && isEditMode && (
                  <FormDescription className="text-xs text-muted-foreground mt-1">
                    Como membro, você não pode alterar as equipes da tarefa.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="user_ids"
            render={() => (
              <FormItem className="h-full">
                <FormLabel>Responsáveis da Tarefa</FormLabel>
                <Card className="h-[calc(100%-2rem)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="h-4 w-4" />
                        Adicionar Responsáveis à Tarefa
                      </div>
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      Selecione os usuários que serão responsáveis por esta tarefa.
                      {form.watch('occupation_ids')?.length === 0 && (
                        <div className="mt-2 text-xs text-amber-500"> {/* Substituído <p> por <div> */}
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          {defaultProjectId
                            ? "Selecione equipes do projeto para ver os usuários disponíveis."
                            : "Selecione equipes primeiro para ver os usuários disponíveis."}
                        </div>
                      )}
                    </div> {/* Substituído CardDescription por <div> */}
                  </CardHeader>
                  <CardContent className="grid gap-2 max-h-[200px] overflow-y-auto">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2 py-1 px-2 hover:bg-muted/50 rounded-md">
                          <Checkbox
                            checked={form.watch('user_ids')?.includes(user.id)}
                            onCheckedChange={(checked) => {
                              const currentUsers = form.watch('user_ids') || [];
                              const newUsers = checked
                                ? [...currentUsers, user.id]
                                : currentUsers.filter(id => id !== user.id);
                              form.setValue('user_ids', newUsers);
                            }}
                            disabled={loading || isPending || (permissions.isMember && isEditMode)}
                          />
                          <label className="flex items-center gap-2 w-full overflow-hidden">
                            <Avatar className="h-6 w-6 flex-shrink-0">
                              <AvatarFallback>
                                {user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'UN'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium truncate">{user.name}</span>
                              <span className="text-xs text-muted-foreground truncate">
                                {getUserTeams(user)}
                              </span>
                            </div>
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {form.watch('occupation_ids')?.length > 0
                          ? "Nenhum usuário encontrado nas equipes selecionadas."
                          : defaultProjectId
                            ? "Selecione equipes do projeto para ver os usuários disponíveis."
                            : "Selecione equipes primeiro para ver os usuários disponíveis."}
                      </p>
                    )}
                  </CardContent>
                </Card>
                {permissions.isMember && isEditMode && (
                  <FormDescription className="text-xs text-muted-foreground mt-1">
                    Como membro, você não pode alterar os responsáveis da tarefa.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Campo oculto para preservar a ordem */}
        <FormField
          control={form.control}
          name="order"
          render={({ field }) => (
            <input type="hidden" {...field} value={field.value || ''} />
          )}
        />

        <div className="flex justify-between gap-2">
          {isEditMode && !permissions.isMember && (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => onSuccess({})}
              disabled={loading || isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </Button>
          )}
          {/* Botão de submit oculto para ser acionado pelos botões externos, com ID dinâmico */}
          <Button type="submit" className="hidden" id={`task-form-submit-${formInstanceId || 'default'}`}>
            Submit
          </Button>
        </div>
      </form>
    </Form>
  );
});
