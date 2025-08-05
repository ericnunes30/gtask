import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import {
  Form,
  FormControl,
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast as uiToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UsersIcon, AlertCircle, AlertTriangle, CalendarIcon } from "lucide-react";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar"; // Importar o componente Calendar correto
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/utils/utils";
import { Project, ProjectPriority, Team, User, CreateProjectRequest, UpdateProjectRequest } from '@/common/types';
import { useBackendServices } from '@/hooks/useBackendServices';
import { Label } from "@/components/ui/label"; // Adicionar importação de Label

// Schema de validação para o formulário
const projectFormSchema = z.object({
  title: z.string().min(3, {
    message: "O título deve ter pelo menos 3 caracteres.",
  }),
  description: z.string().min(2, {
    message: "A descrição deve ter pelo menos 2 caracteres.",
  }),
  priority: z.enum(['baixa', 'media', 'alta', 'urgente'], {
    required_error: "Selecione uma prioridade para o projeto.",
  }),
  status: z.boolean().default(true),
  start_date: z.string().min(1, {
    message: "A data de início é obrigatória.",
  }),
  end_date: z.string().min(1, {
    message: "A data de término é obrigatória.",
  }),
  users: z.array(z.number()).default([]),
  teams: z.array(z.number()).default([]), // Renomeado de 'occupations' para 'teams'
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  projectId?: number;
  initialData?: Project;
  onSuccess?: () => void;
  onDelete?: () => void;
}

export function ProjectForm({ projectId, initialData, onSuccess, onDelete }: ProjectFormProps) {
  const navigate = useNavigate();
  const { projects, users: usersService, teams: teamsService } = useBackendServices();
  const { mutate, isPending } = projects.useCreateProject();
  const { data: usersQueryData = [] as User[] } = usersService.useGetUsers();
  const { data: teamsQueryData = [] as Team[] } = teamsService.useGetTeams();
  const { data: projectData } = projects.useGetProject(projectId as number, Boolean(projectId));
  const loading = isPending;
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);

  // Inicializar o formulário com valores padrão
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "media" as ProjectPriority,
      status: true,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      users: [],
      teams: [], // Renomeado de 'occupations' para 'teams'
    },
  });

  // Carregar dados do projeto se estiver editando
  useEffect(() => {
    // Carregar usuários e equipes da API
    const loadUsersAndTeams = async () => {
      try {
        // Carregar usuários e equipes usando os hooks
        const usersData = usersQueryData;
        const teamsData = teamsQueryData;

        setAllUsers(usersData);
        setTeams(teamsData); // Atribuir a 'teams'

        // Se estiver editando um projeto, usar os valores do formulário
        if (projectId) {
          // Obter os valores atuais do formulário
          const currentValues = form.getValues();

          // Usar as equipes do formulário
          const teamIds = currentValues.teams || []; // Usar 'teams'

          // Definir as equipes selecionadas
          setSelectedTeams(teamIds); // Usar 'selectedTeams'

          // Filtrar usuários com base nas equipes selecionadas
          filterUsersByTeams(teamIds, usersData); // Renomeado função

          // Garantir que os usuários selecionados estejam disponíveis mesmo que não estejam nas equipes selecionadas
          const selectedUserIds = currentValues.users || [];

          // Adicionar usuários selecionados que não estão nas equipes filtradas
          if (selectedUserIds.length > 0) {
            const selectedUsers = usersData.filter(user => selectedUserIds.includes(user.id));

            // Adicionar usuários selecionados aos filtrados
            setFilteredUsers(prevUsers => {
              // Criar um mapa para evitar duplicatas
              const userMap = new Map();

              // Adicionar usuários já filtrados
              prevUsers.forEach(user => userMap.set(user.id, user));

              // Adicionar usuários selecionados
              selectedUsers.forEach(user => userMap.set(user.id, user));

              // Converter de volta para array
              return Array.from(userMap.values());
            });
          }
        } else {
          // Inicialmente, mostrar todos os usuários
          setFilteredUsers(usersData);
        }
      } catch (error) {
        setError('Erro ao carregar usuários e equipes. Tente novamente.'); // Texto atualizado
      }
    };
    loadUsersAndTeams(); // Renomeado função
  }, [projectId, form, initialData?.occupations, usersQueryData, teamsQueryData]); // Manter initialData?.occupations para compatibilidade com o tipo Project

  useEffect(() => {
    if (projectData) {
      const userIds = Array.isArray(projectData.users)
        ? projectData.users.map(user => (typeof user === 'number' ? user : user.id))
        : [];

      const teamIds = Array.isArray(projectData.occupations) // projectData ainda usa 'occupations'
        ? projectData.occupations.map(occ => (typeof occ === 'number' ? occ : occ.id))
        : [];

      form.reset({
        title: projectData.title,
        description: projectData.description,
        priority: projectData.priority,
        status: projectData.status,
        start_date: projectData.start_date.split('T')[0],
        end_date: projectData.end_date.split('T')[0],
        users: userIds,
        teams: teamIds, // Atribuir a 'teams'
      });
    }
  }, [projectData, form]);

  // Função para filtrar usuários com base nas equipes selecionadas
  const filterUsersByTeams = (teamIds: number[], users: User[] = allUsers) => {
    if (!teamIds.length) {
      // Se nenhuma equipe for selecionada, mostrar todos os usuários
      setFilteredUsers(users);

      // Não limpar a seleção de usuários se estiver editando um projeto
      if (!projectId) {
        form.setValue('users', []);
      }
      return;
    }


    // Buscar usuários diretamente das equipes selecionadas
    const selectedTeamsData = teams.filter((team: Team) => teamIds.includes(team.id));

    const usersFromTeams = selectedTeamsData.flatMap(team => team.users || []);

    // Criar um mapa de IDs de usuários para evitar duplicatas
    const userIdMap = new Map();

    // Adicionar usuários das equipes
    usersFromTeams.forEach((user: User) => {
      if (user && user.id) {
        userIdMap.set(user.id, user);
      }
    });

    // Adicionar usuários que têm a ocupação (agora equipe) diretamente associada
    users.forEach((user: User) => {
      // Verificar se o usuário tem uma ocupação e se ela está entre as selecionadas
      const userTeamId = user.occupationId || user.occupation_id;

      // Verificar se o usuário tem múltiplas equipes (ocupações)
      if (user.occupations && Array.isArray(user.occupations)) {
        const hasSelectedTeam = user.occupations.some(occ => {
          const occId = typeof occ === 'number' ? occ : occ.id;
          return teamIds.includes(occId);
        });

        if (hasSelectedTeam) {
          userIdMap.set(user.id, user);
        }
      }

      // Verificar se o usuário tem uma equipe (ocupação) direta
      else if (userTeamId && teamIds.includes(userTeamId)) {
        userIdMap.set(user.id, user);
      }

      // Verificar se o usuário tem um objeto de equipe (ocupação)
      else if (user.occupation && user.occupation.id && teamIds.includes(user.occupation.id)) {
        userIdMap.set(user.id, user);
      }
    });

    // Converter o mapa de volta para um array
    const filtered = Array.from(userIdMap.values());

    setFilteredUsers(filtered);
  };

  // Função para obter as equipes de um usuário
  const getUserTeams = (user: User) => {
    let teamNames: string[] = [];

    // Verificar se o usuário tem múltiplas equipes (ocupações)
    if (user.occupations && Array.isArray(user.occupations) && user.occupations.length > 0) {
      // Mapear IDs de equipes para nomes
      teamNames = user.occupations.map(occ => {
        const occId = typeof occ === 'number' ? occ : occ.id;
        const team = teams.find(t => t.id === occId); // Usar 'teams'
        return team ? team.name : `Equipe ${occId}`;
      });
    }

    // Verificar se o usuário tem uma equipe (ocupação) direta
    const userTeamId = user.occupationId || user.occupation_id;
    if (userTeamId && teamNames.length === 0) {
      const team = teams.find(t => t.id === userTeamId); // Usar 'teams'
      if (team) teamNames.push(team.name);
    }

    // Verificar se o usuário tem um objeto de equipe (ocupação)
    if (user.occupation && user.occupation.id && teamNames.length === 0) {
      const team = teams.find(t => t.id === user.occupation.id); // Usar 'teams'
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
  };

  const onSubmit = (values: ProjectFormValues) => {
    console.log('🚀 ProjectForm.onSubmit iniciado:', values);
    setError(null);

    try {
      // Verificar se usuários foram selecionados
      let selectedUsers = values.users || [];
      console.log('📋 Usuários iniciais:', selectedUsers);

      // Se nenhum usuário foi selecionado, incluir todos os usuários das equipes selecionadas
      if (selectedUsers.length === 0 && values.teams && values.teams.length > 0) {
        console.log('👥 Nenhum usuário selecionado, pegando das equipes:', values.teams);
        console.log('🔍 Usuários filtrados disponíveis:', filteredUsers);
        
        // Obter todos os usuários das equipes selecionadas
        selectedUsers = filteredUsers.map(user => user.id);
        console.log('✅ Usuários selecionados das equipes:', selectedUsers);
      }

      // Preparar os dados do projeto com os usuários selecionados
      const projectData: CreateProjectRequest | UpdateProjectRequest = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        status: values.status,
        start_date: values.start_date,
        end_date: values.end_date,
        users: selectedUsers,
        teams: values.teams || [],
      };

      console.log('📤 Dados do projeto preparados:', projectData);
      console.log('🔄 Iniciando mutação com projectId:', projectId);

      mutate(
        { id: projectId, data: projectData },
        {
          onSuccess: (result) => {
            console.log('✅ Projeto salvo com sucesso:', result);
            toast.success(
              `Projeto "${values.title}" ${projectId ? 'atualizado' : 'criado'} com sucesso.`
            )

            if (onSuccess) {
              console.log('🔄 Chamando callback onSuccess');
              onSuccess()
            } else {
              console.log('🔄 Navegando para /projects');
              navigate('/projects')
            }
          },
          onError: (error) => {
            console.error('❌ Erro ao salvar projeto:', error);
            setError('Ocorreu um erro ao salvar o projeto. Tente novamente.')
            toast.error(
              'Erro ao salvar projeto. Verifique os dados e tente novamente.'
            )
          },
        }
      )
    } catch (error) {
      console.error('❌ Erro no try/catch do onSubmit:', error);
      setError('Ocorreu um erro ao preparar o projeto.')
      toast.error('Erro ao preparar projeto. Verifique os dados.')
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título do Projeto</FormLabel>
              <FormControl>
                <Input placeholder="Título do projeto" {...field} disabled={loading} />
              </FormControl>
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
                  placeholder="Descreva o projeto..."
                  {...field}
                  value={field.value || ""}
                  disabled={loading}
                  className="h-20"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridade</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={loading}
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

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between p-4 border rounded-md">
                <div>
                  <FormLabel className="text-base font-medium">Projeto está ativo?</FormLabel>
                </div>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={loading}
                    className="h-6 w-6"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col relative">
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
                        disabled={loading}
                      >
                        {field.value ? (
                          format(new Date(field.value), "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 block z-50" align="start">
                    <ShadcnCalendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                      initialFocus
                      disabled={loading}
                      className="min-w-[300px] min-h-[300px]" // Adicionado para forçar tamanho mínimo
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col relative">
                <FormLabel>Data de Término</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={loading}
                      >
                        {field.value ? (
                          format(new Date(field.value), "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 block z-50" align="start">
                    <ShadcnCalendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                      initialFocus
                      disabled={loading}
                      className="min-w-[300px] min-h-[300px]" // Adicionado para forçar tamanho mínimo
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="teams"
            render={({ field }) => (
              <FormItem className="h-full">
                <FormLabel>Equipes do Projeto</FormLabel>
                <Card className="h-[calc(100%-2rem)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="h-4 w-4" />
                        Adicionar Equipes ao Projeto
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Selecione as equipes que participarão deste projeto.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2 max-h-[200px] overflow-y-auto">
                    {teams.length > 0 ? (
                      teams.map((team) => (
                        <div key={team.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`team-${team.id}`}
                            checked={field.value?.includes(team.id)}
                            onCheckedChange={(checked) => {
                              const newTeams = checked
                                ? [...(field.value || []), team.id]
                                : (field.value || []).filter((id) => id !== team.id);
                              field.onChange(newTeams);
                              filterUsersByTeams(newTeams);
                            }}
                            disabled={loading}
                          />
                          <Label htmlFor={`team-${team.id}`} className="font-normal cursor-pointer">
                            {team.name}
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-4">Nenhuma equipe disponível.</p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      {field.value?.length || 0} equipe(s) selecionada(s)
                    </p>
                  </CardFooter>
                </Card>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="users"
            render={({ field }) => (
              <FormItem className="h-full">
                <FormLabel>Usuários do Projeto</FormLabel>
                <Card className="h-[calc(100%-2rem)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="h-4 w-4" />
                        Adicionar Usuários ao Projeto
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Selecione os usuários que participarão deste projeto.
                      {form.watch('teams')?.length > 0 && field.value?.length === 0 && (
                        <span className="mt-2 text-xs text-amber-500 block">
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          Se nenhum usuário for selecionado, todos os usuários das equipes selecionadas serão adicionados automaticamente.
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2 max-h-[250px] overflow-y-auto">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2 py-1 px-2 hover:bg-muted/50 rounded-md">
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={field.value?.includes(user.id)}
                            onCheckedChange={(checked) => {
                              const currentUsers = field.value || [];
                              const newUsers = checked
                                ? [...currentUsers, user.id]
                                : currentUsers.filter((id) => id !== user.id);
                              field.onChange(newUsers);
                            }}
                            disabled={loading}
                          />
                          <label htmlFor={`user-${user.id}`} className="flex items-center gap-2 w-full overflow-hidden">
                            <Avatar className="h-6 w-6 flex-shrink-0">
                              {/* <AvatarImage src={user.avatar_url || undefined} alt={user.name} /> */}
                              <AvatarFallback className="text-xs">
                                {user.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col overflow-hidden">
                              <span className="font-medium text-sm truncate">{user.name}</span>
                              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                              <span className="text-xs text-muted-foreground truncate">
                                {getUserTeams(user)}
                              </span>
                            </div>
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-4">Nenhum usuário disponível.</p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      {field.value?.length || 0} usuário(s) selecionado(s)
                    </p>
                  </CardFooter>
                </Card>
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-2 ml-auto">
          {projectId && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={loading}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Remover Projeto
            </Button>
          )}
          <Button type="submit" disabled={loading} className="ml-auto">
            {loading ? 'Salvando...' : projectId ? 'Atualizar Projeto' : 'Criar Projeto'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
