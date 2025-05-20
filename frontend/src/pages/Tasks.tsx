import React, { useState, useEffect, useRef, useCallback } from 'react';
// ... outros imports
import { AppLayout } from '@/components/layout/AppLayout'; // Modificar esta linha
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
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
import { TasksList, TasksListRef } from '@/components/dashboard/TasksList'; // Supondo que TasksListRef exista ou possa ser criado se necessário
import { TaskForm } from '@/components/forms/TaskForm';
import { useLocation, useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { projectService, Project, taskService, Task } from '@/lib/api';
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Remover a linha duplicada
import { Switch } from "@/components/ui/switch"; // Importando o Switch
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { TaskFormRef } from '@/components/forms/TaskForm';

const Tasks = () => {
  console.error("!!!!!!!!!!!!!!!!!!!! TASKS.TSX EXECUTANDO - VERSÃO MAIS RECENTE !!!!!!!!!!!!!!!!!!!!!"); // Adicionar este log
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [taskFormKey, setTaskFormKey] = useState(0); // Chave para TaskForm
  const successCallbackInstanceCounter = useRef(0); // Novo ref
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsWithTasks, setProjectsWithTasks] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("kanban");
  const [rawTasks, setRawTasks] = useState<Task[]>([]); // Novo estado para rawTasks
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'status' | 'date'>('status');
  const [showCompleted, setShowCompleted] = useState(() => {
    // Recuperar do localStorage ou usar false como padrão
    const savedShowCompleted = localStorage.getItem('showCompletedTasksPage');
    return savedShowCompleted === 'true';
  });
  const tasksListRef = useRef<TasksListRef>(null); // Ajustar tipo se TasksListRef for diferente
  const taskFormRef = useRef<TaskFormRef>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = usePermissions();
  // const [kanbanFilteredProjectIds, setKanbanFilteredProjectIds] = useState<Set<number> | null>(null); // Removido

  const searchParams = new URLSearchParams(location.search);
  const projectIdParam = searchParams.get('projectId');
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;

  // useEffect para buscar todas as tarefas (rawTasks)
  useEffect(() => {
    const fetchAllTasks = async () => {
      setLoading(true);
      setError(null);
      try {
        let allTasks = await taskService.getTasks();
        // Aplicar filtro de membro aqui se necessário, antes de passar para o KanbanBoard
        if (permissions.isMember && user) {
          allTasks = allTasks.filter(task => {
            if (!task.users || !Array.isArray(task.users) || task.users.length === 0) return false;
            return task.users.some(taskUser =>
              (typeof taskUser === 'number' && taskUser === user.id) ||
              (typeof taskUser === 'object' && taskUser !== null && taskUser.id === user.id)
            );
          });
        }
        setRawTasks(allTasks);
      } catch (err) {
        console.error('Erro ao carregar todas as tarefas:', err);
        setError('Não foi possível carregar as tarefas. Tente novamente mais tarde.');
        setRawTasks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAllTasks();
  }, [user?.id, permissions.isMember]); // Dependências para buscar rawTasks

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
        return [...prevRawTasks, newTask];
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
    // Não é mais necessário chamar fetchTasks no KanbanBoard diretamente
    // A mudança de filtro será refletida através da prop 'filters'
  };

  const handleProjectChange = (value: string) => {
    if (value === 'all') {
      setSelectedProjectFilter(null);
    } else {
      setSelectedProjectFilter(Number(value));
    }
    // Não é mais necessário chamar fetchTasks no KanbanBoard diretamente
  };

  const handleViewModeChange = (value: 'status' | 'date') => {
    setViewMode(value);
    // Não é mais necessário chamar fetchTasks no KanbanBoard diretamente
    // O KanbanBoard reagirá à mudança da prop viewMode
  };

  const handleShowCompletedChange = (checked: boolean) => {
    setShowCompleted(checked);
    localStorage.setItem('showCompletedTasksPage', String(checked));
    // Não é mais necessário chamar fetchTasks no KanbanBoard diretamente
  };

  // const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number) => { // Removido se handleTasksFiltered for removido
  //   let timer: NodeJS.Timeout;
  //   return (...args: Parameters<T>) => {
  //     clearTimeout(timer);
  //     timer = setTimeout(() => fn(...args), delay);
  //   };
  // };

  // const handleTasksFiltered = debounce((filteredTasks: Task[]) => { // Removido
  //   console.log("Tasks.tsx: Recebido callback onTasksFiltered com", filteredTasks.length, "tarefas.");
  //   const projectIds = new Set<number>();
  //   filteredTasks.forEach(task => {
  //     const taskId = typeof task.project_id === 'string' ? parseInt(task.project_id) : task.project_id;
  //     if (taskId) {
  //       projectIds.add(taskId);
  //     }
  //   });
  //   console.log("Tasks.tsx: IDs de projetos extraídos das tarefas filtradas:", projectIds);
  //   // Comparar com o estado anterior para evitar re-renders desnecessários
  //   if (JSON.stringify(Array.from(projectIds)) !== JSON.stringify(Array.from(kanbanFilteredProjectIds || []))) {
  //       setKanbanFilteredProjectIds(projectIds);
  //   }
  // }, 300);

  // Dentro do componente Tasks, antes do return
  console.log('[Tasks.tsx] Verificando Permissões:', {
    canCreateTasks: permissions.canCreateTasks,
    isMember: permissions.isMember,
    // Se houver outras flags relevantes no seu hook usePermissions, adicione-as aqui
    // Ex: userRoles: user?.roles (se user vier do useAuth e tiver papéis)
  });

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
            {loading ? (
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
          {isDialogOpen && console.log(`[Tasks.tsx] CHECK isDialogOpen is TRUE. taskFormKey: ${taskFormKey}. successCallbackInstanceCounter: ${successCallbackInstanceCounter.current}`)}
          {isDialogOpen && (
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
                {console.log(`[Tasks.tsx] RENDERING DIALOG CONTENT. Key for Dialog: dialog-${taskFormKey}. Callback ID for onSuccess: ${successCallbackInstanceCounter.current}. handleTaskFormSuccess to be passed:`, handleTaskFormSuccess.toString().substring(0, 300) + "...")}
                <div className="py-4">
                  {console.log(`[Tasks.tsx] RENDERING TASKFORM. Key for TaskForm: taskform-${taskFormKey}. InstanceId to be passed: tasks-page-create-dialog-${taskFormKey}`)}
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
            <div className="flex items-center gap-2">
              <Select
                value={selectedPriorityFilter || 'all'}
                onValueChange={handlePriorityChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por prioridade" />
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
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {/* Simplificado para usar projectsWithTasks, que já deve ser filtrado adequadamente */}
                  {projectsWithTasks.map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={viewMode}
                onValueChange={handleViewModeChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Modo de visualização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Por Status</SelectItem>
                  <SelectItem value="date">Por Data</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-sm">Mostrar concluídas</span>
                <Switch
                  checked={showCompleted}
                  onCheckedChange={handleShowCompletedChange}
                />
              </div>
            </div>
          </div>
          <TabsContent value="kanban" className="mt-6">
            <div className="min-h-[500px]">
              {loading && !rawTasks.length ? (
                <Skeleton className="w-full h-[500px]" />
              ) : (
                <KanbanBoard
                  rawTasks={rawTasks}
                  boardMode="tasks-view"
                  viewMode={viewMode}
                  filters={{
                    priority: selectedPriorityFilter,
                    projectId: selectedProjectFilter || projectId, // projectId do filtro ou da URL
                    userId: permissions.isMember && user ? user.id : undefined,
                    showCompleted: showCompleted,
                    // Adicionar outros filtros conforme necessário, ex: searchTerm, tags, etc.
                  }}
                  onTasksUpdated={async () => { // Função para recarregar rawTasks
                    setLoading(true);
                    try {
                      let allTasks = await taskService.getTasks();
                      if (permissions.isMember && user) {
                        allTasks = allTasks.filter(task => 
                          task.users?.some(taskUser => (typeof taskUser === 'number' ? taskUser : taskUser.id) === user.id)
                        );
                      }
                      setRawTasks(allTasks);
                    } catch (err) {
                      setError('Erro ao recarregar tarefas.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                />
              )}
            </div>
          </TabsContent>
          <TabsContent value="list" className="mt-6">
            <div className="border rounded-lg p-4">
              <TasksList
                ref={tasksListRef} // TasksList também precisará ser refatorado para usar rawTasks e filters
                projectId={selectedProjectFilter || projectId} // Manter por compatibilidade com TasksList atual
                priorityFilter={selectedPriorityFilter} // Manter por compatibilidade
                viewMode={viewMode} // Manter por compatibilidade
                selectedUserId={permissions.isMember && user ? user.id : undefined} // Manter por compatibilidade
                forceUserFilter={permissions.isMember} // Manter por compatibilidade
                showCompleted={showCompleted}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Tasks;
