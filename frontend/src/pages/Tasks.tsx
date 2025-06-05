import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// ... outros imports
import AppLayout from '@/components/layout/AppLayout';
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { KanbanTask } from '@/components/kanban/kanbanTypes';
import { sortTasks } from '@/components/kanban/kanbanUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { TasksList } from '@/components/dashboard/TasksList';
import { TaskForm } from '@/components/forms/TaskForm';
import { useLocation, useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { projectService, Project, taskService, Task, TaskStatus, userService, User, TaskPriority } from '@/lib/api';
import { UpdateTaskRequest } from '@/lib/api/tasks';
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { TaskFormRef } from '@/components/forms/TaskForm';

const Tasks = () => {
  console.error("!!!!!!!!!!!!!!!!!!!! TASKS.TSX EXECUTANDO - VERSÃO MAIS RECENTE !!!!!!!!!!!!!!!!!!!!!");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [taskFormKey, setTaskFormKey] = useState(0);
  const successCallbackInstanceCounter = useRef(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsWithTasks, setProjectsWithTasks] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("kanban");
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null); // NOVO ESTADO PARA FILTRO DE USUÁRIO
  const [allUsers, setAllUsers] = useState<User[]>([]); // NOVO ESTADO PARA TODOS OS USUÁRIOS
  const [viewMode, setViewMode] = useState<'status' | 'date'>('status');
  const [showCompleted, setShowCompleted] = useState(() => {
    const savedShowCompleted = localStorage.getItem('showCompletedTasksPage');
    return savedShowCompleted === 'true';
  });
  const tasksListRef = useRef<{ fetchTasks: () => Promise<void> }>(null);
  const taskFormRef = useRef<TaskFormRef>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = usePermissions();
  // Extrair valores primitivos para estabilizar dependências de useCallback
  const currentUserIdAuth = user?.id; // Renomeado para evitar conflito com selectedUserId (estado do filtro)
  const isUserMember = permissions.isMember;
  // const [kanbanFilteredProjectIds, setKanbanFilteredProjectIds] = useState<Set<number> | null>(null); // Removido

  const searchParams = new URLSearchParams(location.search);
  const projectIdParam = searchParams.get('projectId');
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;

  const fetchAllTasks = useCallback(async (showFeedback = false) => {
    if (showFeedback) toast.info("Recarregando tarefas...");
    setLoading(true);
    setError(null);
    try {
      const allTasksData = await taskService.getTasks(); // Não aplicar filtro de membro aqui
      setRawTasks(sortTasks(allTasksData, 'status'));
      // O filtro de membro será aplicado em filteredTasks
      if (showFeedback) toast.success("Tarefas recarregadas!");
    } catch (err) {
      console.error('Erro ao carregar todas as tarefas:', err);
      setError('Não foi possível carregar as tarefas. Tente novamente mais tarde.');
      setRawTasks([]);
      if (showFeedback) toast.error("Falha ao recarregar tarefas.");
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setRawTasks]); // Removido currentUserIdAuth e isUserMember das dependências

  useEffect(() => {
    fetchAllTasks(false); // Chamar sem feedback na carga inicial
  }, [fetchAllTasks]); // Depender da função memoizada

  // useEffect para buscar todos os usuários
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const usersData = await userService.getUsers();
        setAllUsers(usersData);
      } catch (err) {
        console.error('Erro ao carregar todos os usuários:', err);
        toast.error('Falha ao carregar lista de usuários para filtro.');
      }
    };
    fetchAllUsers();
  }, []); // Executar apenas uma vez na montagem

  // useEffect para buscar projetos e atualizar a lista de projetos com tarefas
  useEffect(() => {
    const fetchProjectsAndRelatedData = async () => {
      // setLoading(true); // O loading principal é para rawTasks
      setError(null); // Limpar erro específico de projetos
      try {
        const projectsList = await projectService.getProjects();
        setProjects(projectsList);

        if (projectId) {
          const projectDetails = projectsList.find(p => p.id === projectId);
          if (projectDetails) {
            setCurrentProject(projectDetails);
          } else {
            try {
              const projectFromApi = await projectService.getProject(projectId);
              setCurrentProject(projectFromApi);
            } catch (err) {
              console.error('Erro ao carregar projeto específico:', err);
              setError('Projeto não encontrado ou inacessível.');
            }
          }
        }

        // Atualizar projectsWithTasks baseado nas rawTasks já carregadas
        if (rawTasks.length > 0) {
          const projectIdsInRawTasks = new Set<number>();
          rawTasks.forEach(task => {
            const taskProjectId = typeof task.project_id === 'string'
              ? parseInt(task.project_id)
              : task.project_id;
            if (taskProjectId) {
              projectIdsInRawTasks.add(taskProjectId);
            }
          });
          const projectsWithTasksList = projectsList.filter(project =>
            projectIdsInRawTasks.has(typeof project.id === 'string' ? parseInt(project.id) : project.id)
          );
          setProjectsWithTasks(projectsWithTasksList);
        } else {
          // Se rawTasks ainda não carregou ou está vazia, podemos tentar uma lógica alternativa
          // ou simplesmente esperar que rawTasks seja preenchida.
          // Por ora, se rawTasks estiver vazia, projectsWithTasks também estará (ou usará todos os projetos).
           setProjectsWithTasks(projectsList); // Ou uma lista vazia se preferir até rawTasks carregar
        }

      } catch (err) {
        console.error('Erro ao carregar projetos:', err);
        // Não sobrescrever o erro de carregamento de tarefas, se houver
        if (!error) setError('Não foi possível carregar os projetos.');
      }
      // setLoading(false); // O loading principal é para rawTasks
    };
    fetchProjectsAndRelatedData();
  }, [projectId, rawTasks, error]); // Depender de rawTasks para atualizar projectsWithTasks

   const handleKanbanTaskStatusChange = async (
    task: KanbanTask,
    newStatus: TaskStatus, // TaskStatus de @/lib/api
    newOrder?: number
  ) => {
    console.log('[Tasks.tsx] handleKanbanTaskStatusChange called with - Full Task Object:', JSON.parse(JSON.stringify(task)));
    console.log('[Tasks.tsx] handleKanbanTaskStatusChange called with - Details:', { taskId: task.id, typeofTaskId: typeof task.id, currentStatus: task.status, currentOrder: task.order, newStatus, newOrder });
    try {
      const updateData: UpdateTaskRequest = { status: newStatus };
      if (task.due_date !== undefined) {
        updateData.due_date = task.due_date;
      }
      if (newOrder !== undefined) {
        // TESTE: Enviar order como inteiro arredondado
// Adicionar due_date se presente no objeto da tarefa recebido do KanbanBoard
      if (task.due_date !== undefined) {
        updateData.due_date = task.due_date;
      }
        updateData.order = Math.round(newOrder);
        console.log(`[Tasks.tsx] TESTE: Original newOrder: ${newOrder}, Enviando order arredondado: ${updateData.order}`);
      }
      console.log('[Tasks.tsx] Updating task on API with data:', updateData);
      const updated = await taskService.updateTask(Number(task.id), updateData);
      console.log('[Tasks.tsx] Task updated on API. Updating local state...');
      setRawTasks(prev => {
        const replaced = prev.map(t => (t.id === updated.id ? updated : t));
        return sortTasks(replaced, 'status');
      });
      if (tasksListRef.current) {
        await tasksListRef.current.fetchTasks();
      }
    } catch (error) {
      console.error('Erro ao atualizar tarefa via Kanban:', error);
      toast.error(`Falha ao atualizar tarefa "${task.title}".`);
      console.log('[Tasks.tsx] Error updating task. Fetching all tasks with feedback...');
      await fetchAllTasks(true); // Recarregar com feedback em caso de erro
    }
  };

  const handleKanbanGenericTaskUpdate = async () => {
    await fetchAllTasks(true); // Recarregar com feedback visual
    if (tasksListRef.current) {
      await tasksListRef.current.fetchTasks();
    }
  };

  const handleTaskFormSuccess = useCallback(async (taskData: any) => {
    const callbackId = successCallbackInstanceCounter.current;
    console.log(`[Tasks.tsx] handleTaskFormSuccess (ID: ${callbackId}) INÍCIO. taskData:`, taskData); // Log inicial modificado
    try {
      console.log(`[Tasks.tsx] handleTaskFormSuccess (ID: ${callbackId}): ANTES de chamar taskService.createTask.`);
      const newTask = await taskService.createTask(taskData); // Salvar a nova tarefa
      console.log(`[Tasks.tsx] handleTaskFormSuccess (ID: ${callbackId}): DEPOIS de chamar taskService.createTask. Nova tarefa:`, newTask);
      
      setIsDialogOpen(false);
      console.log(`[Tasks.tsx] handleTaskFormSuccess (ID: ${callbackId}): setIsDialogOpen(false) chamado.`);
      toast.success('Tarefa criada com sucesso!');
      
      // Atualizar rawTasks localmente
      setRawTasks(prevRawTasks => {
        console.log(`[Tasks.tsx] handleTaskFormSuccess (ID: ${callbackId}): Atualizando rawTasks.`);
        return sortTasks([...prevRawTasks, newTask], 'status');
      });

      if (tasksListRef.current && activeTab === 'list') {
        console.log(`[Tasks.tsx] handleTaskFormSuccess (ID: ${callbackId}): Chamando tasksListRef.current.fetchTasks().`);
        tasksListRef.current.fetchTasks();
      }

      const newProjectId = typeof taskData.project_id === 'string'
        ? parseInt(taskData.project_id)
        : taskData.project_id;

      console.log(`[Tasks.tsx] handleTaskFormSuccess (ID: ${callbackId}): Verificando projeto. newProjectId:`, newProjectId);
      if (newProjectId) {
        const projectExists = projectsWithTasks.some(p => {
          const pId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
          return pId === newProjectId;
        });
        console.log(`[Tasks.tsx] handleTaskFormSuccess (ID: ${callbackId}): Projeto existe em projectsWithTasks?`, projectExists);
        if (!projectExists) {
          const project = projects.find(p => {
            const pId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
            return pId === newProjectId;
          });
          console.log(`[Tasks.tsx] handleTaskFormSuccess (ID: ${callbackId}): Projeto encontrado em projects?`, !!project);
          if (project) {
            setProjectsWithTasks(prev => {
              console.log(`[Tasks.tsx] handleTaskFormSuccess (ID: ${callbackId}): Atualizando projectsWithTasks.`);
              return [...prev, project];
            });
          }
        }
      }
      console.log(`[Tasks.tsx] handleTaskFormSuccess (ID: ${callbackId}) FIM do try block.`);
    } catch (error) {
      console.error(`[Tasks.tsx] ERRO CAPTURADO em handleTaskFormSuccess (ID: ${callbackId}):`, error);
      if (error.response) {
        console.error(`[Tasks.tsx] (ID: ${callbackId}) Erro - Dados:`, error.response.data);
        console.error(`[Tasks.tsx] (ID: ${callbackId}) Erro - Status:`, error.response.status);
      } else if (error.request) {
        console.error(`[Tasks.tsx] (ID: ${callbackId}) Erro - Requisição:`, error.request);
      } else {
        console.error(`[Tasks.tsx] (ID: ${callbackId}) Erro - Mensagem:`, error.message);
      }
      toast.error('Erro ao criar tarefa. Verifique os dados e tente novamente.');
    }
  }, [activeTab, projects, projectsWithTasks, setIsDialogOpen, setRawTasks, setProjectsWithTasks, tasksListRef]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handlePriorityChange = (value: string) => {
    if (value === 'all') {
      setSelectedPriorityFilter(null);
    } else {
      setSelectedPriorityFilter(value);
    }
  };

  const handleProjectChange = (value: string) => {
    if (value === 'all') {
      setSelectedProjectFilter(null);
    } else {
      setSelectedProjectFilter(Number(value));
    }
  };

  const handleUserChange = (value: string) => {
    if (value === 'all') {
      setSelectedUserId(null);
    } else {
      setSelectedUserId(Number(value));
    }
  };

  const handleViewModeChange = (value: 'status' | 'date') => {
    setViewMode(value);
  };

  const handleShowCompletedChange = (checked: boolean) => {
    setShowCompleted(checked);
    localStorage.setItem('showCompletedTasksPage', String(checked));
  };

  // Memoized filtered tasks to avoid re-calculating on every render
  const filteredTasks = useMemo(() => {
    let tasksToFilter = [...rawTasks];

    // Apply project filter
    if (selectedProjectFilter !== null) {
      tasksToFilter = tasksToFilter.filter(task => {
        const taskProjectId = typeof task.project_id === 'string' ? parseInt(task.project_id) : task.project_id;
        return taskProjectId === selectedProjectFilter;
      });
    }

    // Apply priority filter
    if (selectedPriorityFilter !== null) {
      tasksToFilter = tasksToFilter.filter(task => task.priority === selectedPriorityFilter);
    }

    // Apply user filter (novo filtro de responsável)
    if (selectedUserId !== null) {
      tasksToFilter = tasksToFilter.filter(task =>
        task.users && task.users.some(userRef =>
          (typeof userRef === 'number' && userRef === selectedUserId) ||
          (typeof userRef === 'object' && userRef !== null && userRef.id === selectedUserId)
        )
      );
    }

    // Apply show completed filter
    if (!showCompleted) {
      tasksToFilter = tasksToFilter.filter(task => task.status !== 'concluido');
    }

    // Apply member filter (if user is a member, only show their tasks)
    // Este filtro é aplicado DEPOIS do filtro de selectedUserId,
    // o que significa que se um membro selecionar "Todos os Responsáveis", ele ainda verá apenas suas tarefas.
    // Se a intenção for que "Todos os Responsáveis" mostre TUDO para um membro, esta lógica precisaria ser ajustada.
    if (isUserMember && currentUserIdAuth) {
      tasksToFilter = tasksToFilter.filter(task => {
        if (!task.users || !Array.isArray(task.users) || task.users.length === 0) return false;
        return task.users.some(taskUser =>
          (typeof taskUser === 'number' && taskUser === currentUserIdAuth) ||
          (typeof taskUser === 'object' && taskUser !== null && taskUser.id === currentUserIdAuth)
        );
      });
    }

    return tasksToFilter;
  }, [rawTasks, selectedProjectFilter, selectedPriorityFilter, selectedUserId, showCompleted, isUserMember, currentUserIdAuth]);


  // Os console.log abaixo foram removidos do JSX para evitar erros de renderização.

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            {loading && !filteredTasks.length ? ( // Ajustado para considerar filteredTasks no loading inicial
              <div className="flex flex-col">
                <Skeleton className="h-10 w-64 mb-2" />
                <Skeleton className="h-5 w-48" />
              </div>
            ) : currentProject ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate('/projects')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h1 className="text-3xl font-bold tracking-tight">
                    Tarefas do Projeto
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground">
                    {currentProject.title}
                  </p>
                  <Badge variant={currentProject.priority === 'urgente' ? "destructive" :
                                 currentProject.priority === 'alta' ? "destructive" :
                                 currentProject.priority === 'media' ? "default" : "secondary"}>
                    Prioridade {currentProject.priority.charAt(0).toUpperCase() + currentProject.priority.slice(1)}
                  </Badge>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
                <p className="text-muted-foreground">
                  Visualize e gerencie todas as suas tarefas.
                </p>
              </div>
            )}
          </div>
          {permissions.canCreateTasks && !permissions.isMember && (
            <Button className="gap-1" disabled={loading} onClick={() => {
              const newKey = taskFormKey + 1;
              setTaskFormKey(newKey);
              // successCallbackInstanceCounter.current += 1; // Movido para onOpenChange do Dialog
              const currentCallbackId = successCallbackInstanceCounter.current;
              console.log(`[Tasks.tsx] "Nova Tarefa" BTN CLICK. New taskFormKey: ${newKey}. Callback ID for onSuccess: ${currentCallbackId}. Current handleTaskFormSuccess:`, handleTaskFormSuccess.toString().substring(0, 300) + "..."); // Log da definição da função (truncada para legibilidade)
              setIsDialogOpen(true);
            }}>
              <PlusCircle className="h-4 w-4" />
              Nova Tarefa
            </Button>
          )}
          {isDialogOpen && (/* {isDialogOpen && console.log(`[Tasks.tsx] CHECK isDialogOpen is TRUE...`)} */ true) && (
            <Dialog key={`dialog-${taskFormKey}`} open={isDialogOpen} onOpenChange={(open) => {
              // Se estiver fechando o diálogo, podemos incrementar o contador para a próxima vez que handleTaskFormSuccess for definido
              if (!open) {
                successCallbackInstanceCounter.current += 1;
              }
              setIsDialogOpen(open);
            }}> {/* Adicionada key ao Dialog */}
              <DialogContent
                className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto"
              >
                <DialogHeader>
                  <DialogTitle>Criar Nova Tarefa</DialogTitle>
                  <DialogDescription>
                    Preencha os detalhes da tarefa. Clique em salvar quando terminar.
                  </DialogDescription>
                </DialogHeader>
                {/* {console.log(`[Tasks.tsx] RENDERING DIALOG CONTENT...`)} */}
                <div className="py-4">
                  {/* {console.log(`[Tasks.tsx] RENDERING TASKFORM...`)} */}
                  <TaskForm
                    key={`taskform-${taskFormKey}`}
                    ref={taskFormRef}
                    onSuccess={handleTaskFormSuccess}
                    defaultProjectId={projectId}
                    formInstanceId={`tasks-page-create-dialog-${taskFormKey}`}
                  />
                </div>
                <DialogFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      console.log(`[Tasks.tsx] Botão Salvar do modal clicado. Acionando submit via ref. taskFormKey: ${taskFormKey}`);
                      taskFormRef.current?.triggerSubmit();
                    }}
                  >
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <Tabs defaultValue="kanban" className="w-full" onValueChange={handleTabChange}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="list">Lista</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 flex-wrap"> {/* Adicionado flex-wrap */}
              <Select
                value={selectedPriorityFilter || 'all'}
                onValueChange={handlePriorityChange}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as prioridades</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={selectedProjectFilter ? String(selectedProjectFilter) : 'all'}
                onValueChange={handleProjectChange}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Todos os projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {projectsWithTasks.map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select // NOVO FILTRO DE USUÁRIO
                value={selectedUserId?.toString() || 'all'}
                onValueChange={handleUserChange}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {allUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name || `Usuário ${u.id}`} {/* Fallback para nome de usuário */}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={viewMode}
                onValueChange={handleViewModeChange}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Visualização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Por Status</SelectItem>
                  <SelectItem value="date">Por Data</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-sm">Mostrar Concluídas</span>
                <Switch
                  checked={showCompleted}
                  onCheckedChange={handleShowCompletedChange}
                />
              </div>
            </div>
          </div>
          <TabsContent value="kanban" className="mt-6">
            <div className="min-h-[500px]">
              {loading && !filteredTasks.length ? (
                <Skeleton className="w-full h-[500px]" />
              ) : (
                <KanbanBoard
                  rawTasks={filteredTasks} // Passando as tarefas já filtradas
                  boardMode="tasks-view"
                  viewMode={viewMode}
                  filters={{
                    priority: selectedPriorityFilter ? selectedPriorityFilter as TaskPriority : undefined,
                    projectId: selectedProjectFilter || projectId,
                    userId: selectedUserId, // Usando o estado do filtro de usuário
                    showCompleted: showCompleted,
                  }}
                  onTaskStatusChange={handleKanbanTaskStatusChange}
                  onGenericTaskUpdate={handleKanbanGenericTaskUpdate}
                />
              )}
            </div>
          </TabsContent>
          <TabsContent value="list" className="mt-6">
            <div className="border rounded-lg p-4">
              <TasksList
                ref={tasksListRef}
                projectId={selectedProjectFilter || projectId} // Passando projectId do filtro ou URL
                selectedTeamId={null} // Não há filtro de equipe nesta página
                selectedUserId={selectedUserId} // Passando o ID do usuário do filtro
                priorityFilter={selectedPriorityFilter ? selectedPriorityFilter as TaskPriority : undefined} // Passando prioridade
                viewMode={viewMode}
                forceUserFilter={isUserMember} // Mantendo a lógica de forçar filtro de usuário para membros
                showCompleted={showCompleted}
                onTasksUpdated={fetchAllTasks} // Callback para atualizar a lista principal
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Tasks;
