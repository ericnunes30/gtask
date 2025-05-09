
import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
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
} from "@/components/ui/dialog";
import { TasksList } from '@/components/dashboard/TasksList';
import { TaskForm } from '@/components/forms/TaskForm';
import { useLocation, useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { projectService, Project, taskService, Task } from '@/lib/api'; // Adicionado Task
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

const Tasks = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsWithTasks, setProjectsWithTasks] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("kanban");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'status' | 'date'>('status');
  const kanbanBoardRef = useRef<any>(null);
  const tasksListRef = useRef<any>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = usePermissions();
  const [kanbanFilteredProjectIds, setKanbanFilteredProjectIds] = useState<Set<number> | null>(null); // Novo estado

  // Extrair projectId da query string
  const searchParams = new URLSearchParams(location.search);
  const projectIdParam = searchParams.get('projectId');
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;

  // Efeito para forçar a atualização dos componentes quando a página é carregada, quando o usuário mudar ou quando a localização mudar
  useEffect(() => {
    // Pequeno delay para garantir que os componentes estejam montados
    const timer = setTimeout(() => {
      if (kanbanBoardRef.current) {
        kanbanBoardRef.current.fetchTasks();
      }

      if (tasksListRef.current) {
        tasksListRef.current.fetchTasks();
      }
    }, 1000); // 1 segundo de delay

    return () => clearTimeout(timer);
  }, [user?.id, permissions.isMember, location.pathname, location.search]); // Executar na montagem da página, quando o usuário ou as permissões mudarem, ou quando a localização mudar

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);

      // Verificar se o usuário é um membro

      try {
        // Carregar projetos da API
        const projectsList = await projectService.getProjects();
        setProjects(projectsList);

        // Se há um projectId na URL, encontrar o projeto correspondente
        if (projectId) {
          try {
            const project = await projectService.getProject(projectId);
            setCurrentProject(project);
          } catch (err) {
            console.error('Erro ao carregar projeto específico:', err);
            setError('Projeto não encontrado ou inacessível.');
          }
        }

        // Adicionar um pequeno delay antes de carregar as tarefas
        // para garantir que todos os dados necessários estejam disponíveis
        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms de delay

        // Carregar todas as tarefas para identificar quais projetos têm tarefas
        try {
          let allTasks = await taskService.getTasks();

          // Se o usuário for um membro, filtrar para mostrar apenas suas tarefas
          if (permissions.isMember && user) {
            allTasks = allTasks.filter(task => {
              if (!task.users || !Array.isArray(task.users) || task.users.length === 0) return false;

              // Verificar se o usuário atual está na lista de usuários da tarefa
              return task.users.some(taskUser =>
                (typeof taskUser === 'number' && taskUser === user.id) ||
                (typeof taskUser === 'object' && taskUser !== null && taskUser.id === user.id)
              );
            });
          }

          // Extrair IDs de projetos que têm tarefas
          const projectIdsWithTasks = new Set<number>();
          allTasks.forEach(task => {
            const taskProjectId = typeof task.project_id === 'string'
              ? parseInt(task.project_id)
              : task.project_id;

            if (taskProjectId) {
              projectIdsWithTasks.add(taskProjectId);
            }
          });

          // Filtrar a lista de projetos para incluir apenas aqueles com tarefas
          const projectsWithTasksList = projectsList.filter(project =>
            projectIdsWithTasks.has(typeof project.id === 'string' ? parseInt(project.id) : project.id)
          );


          setProjectsWithTasks(projectsWithTasksList);
        } catch (err) {
          // Fallback para todos os projetos em caso de erro
          setProjectsWithTasks(projectsList);
        }
      } catch (err) {
        setError('Não foi possível carregar os projetos. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [projectId]);

  const handleTaskFormSuccess = async (taskData: any) => {
    try {
      // Criar a tarefa na API
      await taskService.createTask(taskData);

      setIsDialogOpen(false);
      toast.success('Tarefa criada com sucesso!');

      // Recarregar os componentes de tarefas
      if (kanbanBoardRef.current && activeTab === 'kanban') {
        kanbanBoardRef.current.fetchTasks();
      }

      if (tasksListRef.current && activeTab === 'list') {
        tasksListRef.current.fetchTasks();
      }

      // Verificar se o projeto da nova tarefa já está na lista de projetos com tarefas
      const projectId = typeof taskData.project_id === 'string'
        ? parseInt(taskData.project_id)
        : taskData.project_id;

      if (projectId) {
        const projectExists = projectsWithTasks.some(p => {
          const pId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
          return pId === projectId;
        });

        // Se o projeto não estiver na lista, adicionar
        if (!projectExists) {
          const project = projects.find(p => {
            const pId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
            return pId === projectId;
          });

          if (project) {
            setProjectsWithTasks(prev => [...prev, project]);
          }
        }
      }
    } catch (error) {
      toast.error('Erro ao criar tarefa. Verifique os dados e tente novamente.');
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Função para lidar com a mudança de prioridade selecionada
  const handlePriorityChange = (value: string) => {
    if (value === 'all') {
      setSelectedPriorityFilter(null);
    } else {
      setSelectedPriorityFilter(value);
    }

    // Atualizar os componentes com os novos filtros
    // Aumentar o delay para garantir que o estado foi atualizado
    setTimeout(() => {
      if (activeTab === 'kanban' && kanbanBoardRef.current) {
        kanbanBoardRef.current.fetchTasks();
      } else if (activeTab === 'list' && tasksListRef.current) {
        tasksListRef.current.fetchTasks();
      }
    }, 500); // Aumentado para 500ms
  };

  // Função para lidar com a mudança de projeto selecionado
  const handleProjectChange = (value: string) => {
    if (value === 'all') {
      setSelectedProjectFilter(null);
    } else {
      setSelectedProjectFilter(Number(value));
    }

    // Atualizar os componentes com os novos filtros
    // Aumentar o delay para garantir que o estado foi atualizado
    setTimeout(() => {
      if (activeTab === 'kanban' && kanbanBoardRef.current) {
        kanbanBoardRef.current.fetchTasks();
      } else if (activeTab === 'list' && tasksListRef.current) {
        tasksListRef.current.fetchTasks();
      }
    }, 500); // Aumentado para 500ms
  };

  // Função para lidar com a mudança de modo de visualização
  const handleViewModeChange = (value: 'status' | 'date') => {
    setViewMode(value);

    // Atualizar os componentes com o novo modo de visualização
    // Aumentar o delay para garantir que o estado foi atualizado
    setTimeout(() => {
      if (activeTab === 'kanban' && kanbanBoardRef.current) {
        kanbanBoardRef.current.fetchTasks();
      } else if (activeTab === 'list' && tasksListRef.current) {
        tasksListRef.current.fetchTasks();
      }
    }, 500); // Aumentado para 500ms
  };

  // Callback para receber tarefas filtradas do KanbanBoard
  const handleTasksFiltered = (filteredTasks: Task[]) => {
    console.log("Tasks.tsx: Recebido callback onTasksFiltered com", filteredTasks.length, "tarefas.");
    const projectIds = new Set<number>();
    filteredTasks.forEach(task => {
      const taskId = typeof task.project_id === 'string' ? parseInt(task.project_id) : task.project_id;
      if (taskId) {
        projectIds.add(taskId);
      }
    });
    console.log("Tasks.tsx: IDs de projetos extraídos das tarefas filtradas:", projectIds);
    setKanbanFilteredProjectIds(projectIds);
  };

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
            <Button className="gap-1" disabled={loading} onClick={() => setIsDialogOpen(true)}>
              <PlusCircle className="h-4 w-4" />
              Nova Tarefa
            </Button>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova Tarefa</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes da tarefa. Clique em salvar quando terminar.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <TaskForm onSuccess={handleTaskFormSuccess} defaultProjectId={projectId} />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="kanban" className="w-full" onValueChange={handleTabChange}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="list">Lista</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              {/* Seletor de prioridade */}
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

              {/* Seletor de projeto */}
              <Select
                value={selectedProjectFilter ? String(selectedProjectFilter) : 'all'}
                onValueChange={handleProjectChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {(permissions.isMember && kanbanFilteredProjectIds
                    ? projects.filter(p => kanbanFilteredProjectIds.has(Number(p.id))) // Filtra se for membro e tiver IDs do kanban
                    : projectsWithTasks // Caso contrário, usa a lista pré-calculada
                  ).map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Seletor de modo de visualização */}
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
            </div>
          </div>
          <TabsContent value="kanban" className="mt-6">
            <div className="min-h-[500px]">
              <KanbanBoard
                ref={kanbanBoardRef}
                projectId={selectedProjectFilter || projectId}
                priorityFilter={selectedPriorityFilter}
                viewMode={viewMode}
                selectedUserId={permissions.isMember && user ? user.id : undefined}
                forceUserFilter={permissions.isMember}
                onTasksFiltered={handleTasksFiltered} // Passa o callback
              />
            </div>
          </TabsContent>
          <TabsContent value="list" className="mt-6">
            <div className="border rounded-lg p-4">
              <TasksList
                ref={tasksListRef}
                projectId={selectedProjectFilter || projectId}
                priorityFilter={selectedPriorityFilter}
                viewMode={viewMode}
                selectedUserId={permissions.isMember && user ? user.id : undefined}
                forceUserFilter={permissions.isMember}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Tasks;
