
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Calendar, Users, ChevronDown, Building2, Edit, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { Card } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { projectService, Project, ProjectPriority } from '@/lib/api';
import { convertApiProjectToFrontend } from '@/lib/api/projects';
import { taskService, userService, teamService, User, Team } from '@/lib/api';
import { ProjectForm } from '@/components/forms/ProjectForm';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { TasksList } from '@/components/dashboard/TasksList';

const ProjectView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [rawTasks, setRawTasks] = useState<any[]>([]); // Renomeado de tasks para rawTasks
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<ProjectPriority | 'todos'>('todos');
  const [kanbanViewMode, setKanbanViewMode] = useState<'status' | 'date'>('status');
  const [projectUsers, setProjectUsers] = useState<User[]>([]);
  const [projectTeams, setProjectTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const tasksListRef = React.useRef<{ fetchTasks: () => Promise<void> }>(null);
  const { user } = useAuth();
  const permissions = usePermissions();

  // Referência para o componente KanbanBoard - Removida
  // const kanbanBoardRef = React.useRef<{ fetchTasks: () => Promise<void> }>(null);

  // Função para atualizar as tarefas do projeto
  const updateProjectTasks = useCallback(async () => {
    if (!projectId) return;


    try {
      // Buscar o projeto atualizado da API
      const id = parseInt(projectId);
      const projectData = await projectService.getProject(id);

      // Atualizar as tarefas
      const projectTasks = projectData.tasks || [];
      setRawTasks(projectTasks); // Atualiza rawTasks

      // Log para verificar tarefas atrasadas
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      projectTasks.filter(t => {
        if (!t.due_date) return false;
        const dueDate = new Date(t.due_date);
        return dueDate < today && t.status !== 'concluido';
      });

      // Recalcular progresso
      if (projectTasks.length > 0) {
        const completedTasks = projectTasks.filter(task => task.status === 'concluido').length;
        const calculatedProgress = Math.round((completedTasks / projectTasks.length) * 100);
        setProgress(calculatedProgress);
      }

    } catch (err) {
      console.error('Erro ao atualizar tarefas do projeto:', err);
    }
  }, [projectId]); // Removido tasks.length, pois agora setRawTasks é chamado

  // Efeito para forçar a atualização das estatísticas quando o componente é montado
  useEffect(() => {
    if (!isLoading && project) {
      updateProjectTasks();
    }
  }, [isLoading, project, updateProjectTasks]);

  // Efeito para forçar a atualização das estatísticas a cada 5 segundos
  useEffect(() => {
    if (!isLoading && project) {
      const interval = setInterval(() => {
        updateProjectTasks();
      }, 5000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [isLoading, project, updateProjectTasks]);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;

      setIsLoading(true);
      setError(null);

      try {
        // Converter projectId para número
        const id = parseInt(projectId);

        // Carregar projeto da API
        const projectData = await projectService.getProject(id);
        // Garantir que os dados do projeto estejam no formato correto
        const convertedProject = convertApiProjectToFrontend(projectData);
        setProject(convertedProject);

        // Usar as tarefas que já vêm incluídas no projeto
        const projectTasks = projectData.tasks || [];
        setRawTasks(projectTasks); // Define rawTasks

        // Calcular progresso com base nas tarefas concluídas
        if (projectTasks.length > 0) {
          const completedTasks = projectTasks.filter(task => task.status === 'concluido').length;
          const calculatedProgress = Math.round((completedTasks / projectTasks.length) * 100);
          setProgress(calculatedProgress);
        }

        // Usar diretamente os usuários e equipes do projeto retornados pela API

        // Verificar se o projeto tem usuários e equipes
        if (projectData.users && Array.isArray(projectData.users)) {
          // Verificar se os usuários são objetos completos ou apenas IDs
          const usersArray = projectData.users.map(user => {
            if (typeof user === 'object' && user !== null) {
              return user; // Já é um objeto de usuário completo
            }
            return null; // Não podemos processar apenas IDs aqui
          }).filter(user => user !== null);

          setProjectUsers(usersArray as User[]);
        }

        if (projectData.occupations && Array.isArray(projectData.occupations)) {
          // Verificar se as equipes são objetos completos ou apenas IDs
          const teamsArray = projectData.occupations.map(team => {
            if (typeof team === 'object' && team !== null) {
              return team; // Já é um objeto de equipe completo
            }
            return null; // Não podemos processar apenas IDs aqui
          }).filter(team => team !== null);

          setProjectTeams(teamsArray as Team[]);
        }

        // Carregar todos os usuários e equipes para referência
        const [usersData, teamsData] = await Promise.all([
          userService.getUsers(),
          teamService.getTeams()
        ]);

        setAllUsers(usersData);
        setAllTeams(teamsData);
      } catch (err) {
        console.error('Erro ao carregar dados do projeto:', err);
        setError('Não foi possível carregar os dados do projeto. Tente novamente mais tarde.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);

  // Efeito para atualizar os componentes KanbanBoard e TasksList quando o projectId mudar
  // ou quando os dados do projeto são carregados
  useEffect(() => {
    // Só executar quando o projeto estiver carregado e não estiver mais em loading
    if (project && !isLoading) {
      // Limpar seleções de filtro ao mudar de projeto
      // setSelectedTeamId(null); // Estes filtros agora são parte do objeto 'filters'
      // setSelectedUserId(null);

      // Não é mais necessário chamar fetchTasks diretamente no KanbanBoard ou TasksList
      // Eles reagirão às props rawTasks e filters.
      // A lógica de timeout pode ser removida ou repensada se ainda for necessária para algo.
    }
  }, [projectId, project, isLoading]); // Removidas as refs dos componentes filhos

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate('/projects')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-10 w-64" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 col-span-2">
              <Skeleton className="h-7 w-48 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>

                {/* Skeleton para informações do projeto em uma única linha */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Skeleton para Data de Início */}
                  <div>
                    <Skeleton className="h-5 w-36 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>

                  {/* Skeleton para Data de Término */}
                  <div>
                    <Skeleton className="h-5 w-36 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>

                  {/* Skeleton para Equipes */}
                  <div>
                    <Skeleton className="h-5 w-36 mb-2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                  </div>

                  {/* Skeleton para Usuários */}
                  <div>
                    <Skeleton className="h-5 w-36 mb-2" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-10" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <Skeleton className="h-7 w-32 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !project) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-6">
          <Button
            variant="ghost"
            className="w-fit gap-2"
            onClick={() => navigate('/projects')}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Projetos
          </Button>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Projeto não encontrado. Verifique se o ID está correto.'}
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para lidar com a mudança de equipe selecionada
  const handleTeamChange = (value: string) => {
    if (value === 'all') {
      setSelectedTeamId(null);
    } else {
      setSelectedTeamId(Number(value));
    }

    // Atualizar o Kanban após a mudança de filtro
    // Não é mais necessário chamar fetchTasks diretamente, pois os filtros são passados via props.
    // setTimeout(() => {
    //   if (kanbanBoardRef.current) {
    //     kanbanBoardRef.current.fetchTasks();
    //   }
    // }, 100);
  };

  // Função para lidar com a mudança de usuário selecionado
  const handleUserChange = (value: string) => {
    if (value === 'all') {
      setSelectedUserId(null);
    } else {
      setSelectedUserId(Number(value));
    }

    // Atualizar o Kanban após a mudança de filtro
    // Não é mais necessário chamar fetchTasks diretamente, pois os filtros são passados via props.
    // setTimeout(() => {
    //   if (kanbanBoardRef.current) {
    //     kanbanBoardRef.current.fetchTasks();
    //   }
    // }, 100);
  };

  // Função para lidar com a mudança de modo de visualização
  const handleViewModeChange = (value: 'status' | 'date') => {
    setKanbanViewMode(value);
    // Não precisamos chamar fetchTasks aqui, pois o componente KanbanBoard
    // já tem um efeito que observa mudanças no viewMode
  };

  // Função para lidar com o sucesso da edição do projeto
  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    // Recarregar os dados do projeto para refletir as alterações
    if (projectId) {
      const id = parseInt(projectId);
      projectService.getProject(id).then(projectData => {
        const convertedProject = convertApiProjectToFrontend(projectData);
        setProject(convertedProject);

        // Usar as tarefas que já vêm incluídas no projeto
        const projectTasks = projectData.tasks || [];
        setRawTasks(projectTasks); // Corrigido de setTasks para setRawTasks

        // Recalcular progresso com base nas tarefas concluídas
        if (projectTasks.length > 0) {
          const completedTasks = projectTasks.filter(task => task.status === 'concluido').length;
          const calculatedProgress = Math.round((completedTasks / projectTasks.length) * 100);
          setProgress(calculatedProgress);
        }

        // Atualizar usuários e equipes do projeto
        if (projectData.users && Array.isArray(projectData.users)) {
          const usersArray = projectData.users
            .map(user => typeof user === 'object' && user !== null ? user : null)
            .filter(user => user !== null);
          setProjectUsers(usersArray as User[]);
        }

        if (projectData.occupations && Array.isArray(projectData.occupations)) {
          const teamsArray = projectData.occupations
            .map(team => typeof team === 'object' && team !== null ? team : null)
            .filter(team => team !== null);
          setProjectTeams(teamsArray as Team[]);
        }
      });
    }
  };

  // Função para lidar com a remoção do projeto
  const handleDeleteProject = async () => {
    if (!projectId) return;

    try {
      const id = parseInt(projectId);
      await projectService.deleteProject(id);
      toast.success('Projeto removido com sucesso!');
      setIsDeleteDialogOpen(false);
      // Navegar de volta para a lista de projetos
      navigate('/projects');
    } catch (error) {
      console.error('Erro ao remover projeto:', error);
      toast.error('Erro ao remover projeto. Tente novamente.');
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
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
              {project.title}
            </h1>
            {!permissions.isMember && (
              <div className="flex gap-2 ml-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remover
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={project.priority === 'urgente' ? "destructive" :
                   project.priority === 'alta' ? "destructive" :
                   project.priority === 'media' ? "default" : "secondary"}>
              Prioridade {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
            </Badge>
            <Badge variant={project.status ? "default" : "secondary"}>
              {project.status ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 col-span-2">
            <h2 className="text-lg font-medium mb-4">Informações do Projeto</h2>
            {project.description && (
              <p className="text-muted-foreground mb-4">{project.description}</p>
            )}

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Progresso Geral</span>
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Concluídas: {rawTasks.filter(t => t.status === 'concluido').length} de {rawTasks.length}</span>
                  <span>Em andamento: {rawTasks.filter(t => ['em_andamento', 'em_revisao'].includes(t.status)).length}</span>
                </div>
              </div>

              {/* Informações do projeto em uma única linha: datas, equipes, usuários */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Datas */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Data de Início</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(project.start_date || project.startDate)}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Data de Término</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(project.end_date || project.endDate)}
                  </div>
                </div>

                {/* Equipes do Projeto */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Equipes do Projeto</h3>
                  {projectTeams.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {projectTeams.map((team) => (
                        <Badge key={team.id} variant="outline" className="rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-200">
                          <Building2 className="h-3 w-3 mr-1" />
                          {team.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma equipe atribuída</p>
                  )}
                </div>

                {/* Usuários do Projeto */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Usuários do Projeto</h3>
                  {projectUsers.length > 0 ? (
                    <div className="flex items-center gap-2">
                      {/* Mostrar apenas os dois primeiros usuários */}
                      <div className="flex -space-x-2">
                        {projectUsers.slice(0, 2).map((user) => (
                          <Avatar key={user.id} className="border-2 border-background h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>

                      {/* Se houver mais de 2 usuários, mostrar um popover com todos */}
                      {projectUsers.length > 2 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 px-2 gap-1">
                              +{projectUsers.length - 2}
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-60 p-2">
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Todos os usuários</h4>
                              <div className="space-y-1">
                                {projectUsers.map((user) => (
                                  <div key={user.id} className="flex items-center gap-2 p-1 rounded-md hover:bg-accent">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs">
                                        {user.name.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{user.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum usuário atribuído</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Estatísticas</h2>
              <div className="text-xs text-muted-foreground">
                Atualizado em: {formatDate(project.updated_at || project.updatedAt)}
              </div>
            </div>
            <div className="space-y-6">
              {/* Resumo de Tarefas */}
              <div>
                <h3 className="text-sm font-medium mb-3">Tarefas</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-accent/20 rounded-lg p-3 flex flex-col items-center justify-center">
                    <p className="text-xs text-muted-foreground mb-1">Total</p>
                    <p className="text-xl font-bold">{rawTasks.length}</p>
                  </div>
                  <div className="bg-accent/20 rounded-lg p-3 flex flex-col items-center justify-center">
                    <p className="text-xs text-muted-foreground mb-1">Atrasadas</p>
                    <p className="text-xl font-bold text-red-500">
                      {(() => {
                        const atrasadas = rawTasks.filter(t => {
                          if (!t.due_date) return false;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const dueDate = new Date(t.due_date);
                          return dueDate < today && t.status !== 'concluido';
                        });
                        return atrasadas.length;
                      })()}
                    </p>
                  </div>
                  <div className="bg-accent/20 rounded-lg p-3 flex flex-col items-center justify-center">
                    <p className="text-xs text-muted-foreground mb-1">Concluídas</p>
                    <p className="text-xl font-bold">{rawTasks.filter(t => t.status === 'concluido').length}</p>
                  </div>
                </div>
              </div>

              {/* Status das Tarefas */}
              <div>
                <h3 className="text-sm font-medium mb-3">Status das Tarefas</h3>
                <div className="space-y-2">
                  {/* Status com barras de progresso */}
                  <div className="grid grid-cols-[1fr,auto] gap-x-4 gap-y-2 items-center">
                    {/* Pendente */}
                    <span className="text-sm text-muted-foreground">Pendente:</span>
                    <span className="text-sm font-medium">{rawTasks.filter(t => t.status === 'pendente').length}</span>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden col-span-2">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: rawTasks.length > 0
                            ? `${(rawTasks.filter(t => t.status === 'pendente').length / rawTasks.length) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>

                    {/* A Fazer */}
                    <span className="text-sm text-muted-foreground">A Fazer:</span>
                    <span className="text-sm font-medium">{rawTasks.filter(t => t.status === 'a_fazer').length}</span>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden col-span-2">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{
                          width: rawTasks.length > 0
                            ? `${(rawTasks.filter(t => t.status === 'a_fazer').length / rawTasks.length) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>

                    {/* Em Andamento */}
                    <span className="text-sm text-muted-foreground">Em Andamento:</span>
                    <span className="text-sm font-medium">{rawTasks.filter(t => t.status === 'em_andamento').length}</span>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden col-span-2">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{
                          width: rawTasks.length > 0
                            ? `${(rawTasks.filter(t => t.status === 'em_andamento').length / rawTasks.length) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>

                    {/* Em Revisão */}
                    <span className="text-sm text-muted-foreground">Em Revisão:</span>
                    <span className="text-sm font-medium">{rawTasks.filter(t => t.status === 'em_revisao').length}</span>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden col-span-2">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: rawTasks.length > 0
                            ? `${(rawTasks.filter(t => t.status === 'em_revisao').length / rawTasks.length) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>

                    {/* Concluído */}
                    <span className="text-sm text-muted-foreground">Concluído:</span>
                    <span className="text-sm font-medium">{rawTasks.filter(t => t.status === 'concluido').length}</span>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden col-span-2">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: rawTasks.length > 0
                            ? `${(rawTasks.filter(t => t.status === 'concluido').length / rawTasks.length) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>


            </div>
          </Card>
        </div>

        <Card>
          <Tabs defaultValue="kanban" className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
                <TabsTrigger value="list">Lista</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Select
                  value={priorityFilter}
                  onValueChange={(value) => setPriorityFilter(value as ProjectPriority | 'todos')}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas Prioridades</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={selectedTeamId ? String(selectedTeamId) : 'all'}
                  onValueChange={handleTeamChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as equipes</SelectItem>
                    {projectTeams.map((team) => (
                      <SelectItem key={team.id} value={String(team.id)}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Seletor de usuário responsável */}
                <Select
                  value={selectedUserId ? String(selectedUserId) : 'all'}
                  onValueChange={handleUserChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os responsáveis</SelectItem>
                    {projectUsers.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Seletor de modo de visualização do Kanban */}
                <Select
                  value={kanbanViewMode}
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
              <div className="px-5">
                {isLoading && !rawTasks.length ? (
                  <Skeleton className="w-full h-[500px]" />
                ) : (
                  <KanbanBoard
                    rawTasks={rawTasks}
                    boardMode="project-view"
                    viewMode={kanbanViewMode}
                    filters={{
                      priority: priorityFilter === 'todos' ? null : priorityFilter,
                      teamId: selectedTeamId,
                      userId: selectedUserId,
                      // No ProjectView, geralmente mostramos todas as tarefas (concluídas ou não)
                      // a menos que haja um switch específico para isso nesta página.
                      // Por ora, vamos assumir que sempre mostra concluídas.
                      showCompleted: true,
                    }}
                    projectId={projectId} // Passar o projectId string
                    project={project} // Passar o objeto do projeto se o KanbanBoard ainda o utiliza
                    onTasksUpdated={updateProjectTasks} // Manter para recarregar rawTasks
                  />
                )}
              </div>
            </TabsContent>
            <TabsContent value="list" className="mt-6">
              <div className="px-5">
                {/* TasksList também precisará ser refatorado para usar rawTasks e filters */}
                <TasksList
                  ref={tasksListRef}
                  projectId={parseInt(projectId || '0')} // Manter por compatibilidade
                  teams={projectTeams} // Manter por compatibilidade
                  selectedTeamId={selectedTeamId} // Manter por compatibilidade
                  selectedUserId={selectedUserId} // Manter por compatibilidade
                  priorityFilter={priorityFilter === 'todos' ? undefined : priorityFilter} // Manter por compatibilidade
                  viewMode={kanbanViewMode} // Manter por compatibilidade
                  onTasksUpdated={updateProjectTasks} // Manter por compatibilidade
                  forceUserFilter={false} // Manter por compatibilidade
                  // showCompleted={true} // Adicionar se TasksList tiver essa prop
                />
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Diálogo de edição do projeto */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Projeto</DialogTitle>
              <DialogDescription>
                Edite os detalhes do projeto. Clique em salvar quando terminar.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {project && (
                <>
                  <ProjectForm
                    projectId={parseInt(projectId || '0')}
                    initialData={project}
                    onSuccess={handleEditSuccess}
                    onDelete={() => {
                      setIsEditDialogOpen(false);
                      setIsDeleteDialogOpen(true);
                    }}
                  />


                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de confirmação para remoção de projeto */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Projeto</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover o projeto "{project?.title}"?
                Esta ação não pode ser desfeita e todas as tarefas associadas a este projeto serão removidas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProject}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default ProjectView;
