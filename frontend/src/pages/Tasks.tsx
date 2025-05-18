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
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { TasksList } from '@/components/dashboard/TasksList';
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
  const [showCompleted, setShowCompleted] = useState(() => {
    const saved = localStorage.getItem('showCompleted');
    return saved ? saved === 'true' : false;
  });
  const kanbanBoardRef = useRef<any>(null);
  const tasksListRef = useRef<any>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = usePermissions();
  const [kanbanFilteredProjectIds, setKanbanFilteredProjectIds] = useState<Set<number> | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const projectIdParam = searchParams.get('projectId');
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (kanbanBoardRef.current) {
        kanbanBoardRef.current.fetchTasks();
      }
      if (tasksListRef.current) {
        tasksListRef.current.fetchTasks();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [user?.id, permissions.isMember, location.pathname, location.search, showCompleted]); // Adicionado showCompleted

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const projectsList = await projectService.getProjects();
        setProjects(projectsList);
        if (projectId) {
          try {
            const project = await projectService.getProject(projectId);
            setCurrentProject(project);
          } catch (err) {
            console.error('Erro ao carregar projeto específico:', err);
            setError('Projeto não encontrado ou inacessível.');
          }
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        try {
          let allTasks = await taskService.getTasks();
          if (permissions.isMember && user) {
            allTasks = allTasks.filter(task => {
              if (!task.users || !Array.isArray(task.users) || task.users.length === 0) return false;
              return task.users.some(taskUser =>
                (typeof taskUser === 'number' && taskUser === user.id) ||
                (typeof taskUser === 'object' && taskUser !== null && taskUser.id === user.id)
              );
            });
          }
          const projectIdsWithTasks = new Set<number>();
          allTasks.forEach(task => {
            const taskProjectId = typeof task.project_id === 'string'
              ? parseInt(task.project_id)
              : task.project_id;
            if (taskProjectId) {
              projectIdsWithTasks.add(taskProjectId);
            }
          });
          const projectsWithTasksList = projectsList.filter(project =>
            projectIdsWithTasks.has(typeof project.id === 'string' ? parseInt(project.id) : project.id)
          );
          setProjectsWithTasks(projectsWithTasksList);
        } catch (err) {
          setProjectsWithTasks(projectsList);
        }
      } catch (err) {
        setError('Não foi possível carregar os projetos. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [projectId, user, permissions.isMember, showCompleted]); // Adicionado user, permissions.isMember e showCompleted

  const handleTaskFormSuccess = async (taskData: any) => {
    try {
      await taskService.createTask(taskData);
      setIsDialogOpen(false);
      toast.success('Tarefa criada com sucesso!');
      if (kanbanBoardRef.current && activeTab === 'kanban') {
        kanbanBoardRef.current.fetchTasks();
      }
      if (tasksListRef.current && activeTab === 'list') {
        tasksListRef.current.fetchTasks();
      }
      const newProjectId = typeof taskData.project_id === 'string'
        ? parseInt(taskData.project_id)
        : taskData.project_id;
      if (newProjectId) {
        const projectExists = projectsWithTasks.some(p => {
          const pId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
          return pId === newProjectId;
        });
        if (!projectExists) {
          const project = projects.find(p => {
            const pId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
            return pId === newProjectId;
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

  const handlePriorityChange = (value: string) => {
    if (value === 'all') {
      setSelectedPriorityFilter(null);
    } else {
      setSelectedPriorityFilter(value);
    }
    setTimeout(() => {
      if (activeTab === 'kanban' && kanbanBoardRef.current) {
        kanbanBoardRef.current.fetchTasks();
      } else if (activeTab === 'list' && tasksListRef.current) {
        tasksListRef.current.fetchTasks();
      }
    }, 500);
  };

  const handleProjectChange = (value: string) => {
    if (value === 'all') {
      setSelectedProjectFilter(null);
    } else {
      setSelectedProjectFilter(Number(value));
    }
    setTimeout(() => {
      if (activeTab === 'kanban' && kanbanBoardRef.current) {
        kanbanBoardRef.current.fetchTasks();
      } else if (activeTab === 'list' && tasksListRef.current) {
        tasksListRef.current.fetchTasks();
      }
    }, 500);
  };

  const handleViewModeChange = (value: 'status' | 'date') => {
    setViewMode(value);
    setTimeout(() => {
      if (activeTab === 'kanban' && kanbanBoardRef.current) {
        kanbanBoardRef.current.fetchTasks();
      } else if (activeTab === 'list' && tasksListRef.current) {
        tasksListRef.current.fetchTasks();
      }
    }, 500);
  };

  const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number) => {
    let timer: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const handleTasksFiltered = debounce((filteredTasks: Task[]) => {
    console.log("Tasks.tsx: Recebido callback onTasksFiltered com", filteredTasks.length, "tarefas.");
    const projectIds = new Set<number>();
    filteredTasks.forEach(task => {
      const taskId = typeof task.project_id === 'string' ? parseInt(task.project_id) : task.project_id;
      if (taskId) {
        projectIds.add(taskId);
      }
    });
    console.log("Tasks.tsx: IDs de projetos extraídos das tarefas filtradas:", projectIds);
    // Comparar com o estado anterior para evitar re-renders desnecessários
    if (JSON.stringify(Array.from(projectIds)) !== JSON.stringify(Array.from(kanbanFilteredProjectIds || []))) {
        setKanbanFilteredProjectIds(projectIds);
    }
  }, 300);

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
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) {
              setIsDialogOpen(false);
            } else {
              setIsDialogOpen(true);
            }
          }}>
            <DialogContent
              className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto"
            >
              <DialogHeader>
                <DialogTitle>Criar Nova Tarefa</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes da tarefa. Clique em salvar quando terminar.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <TaskForm
                  onSuccess={handleTaskFormSuccess}
                  defaultProjectId={projectId}
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
                    const submitButton = document.getElementById('task-form-submit');
                    if (submitButton) {
                      (submitButton as HTMLButtonElement).click();
                    } else {
                      console.error('Botão de submit não encontrado');
                    }
                  }}
                >
                  Salvar
                </Button>
              </DialogFooter>
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
                  {(permissions.isMember && kanbanFilteredProjectIds
                    ? projects.filter(p => kanbanFilteredProjectIds.has(Number(p.id)))
                    : projectsWithTasks
                  ).map((project) => (
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
                  onCheckedChange={(checked) => {
                    setShowCompleted(checked);
                    localStorage.setItem('showCompleted', String(checked));
                  }}
                />
              </div>
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
                showCompleted={showCompleted}
                onTasksFiltered={handleTasksFiltered}
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
                showCompleted={showCompleted} // Passando a prop showCompleted
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Tasks;
