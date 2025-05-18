import React, { useState, useEffect, useCallback, useImperativeHandle } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlusCircle, MoreHorizontal, Calendar, AlertCircle, Briefcase, Timer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";


import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { taskService, Task, TaskStatus } from '@/lib/api';
import { UpdateTaskRequest } from '@/lib/api/tasks';
import TaskDetailsModal from "@/components/tasks/TaskDetailsModal";
import { TaskForm } from '@/components/forms/TaskForm';
import { TaskTimer } from '@/components/tasks/TaskTimer';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

// Map para prioridades dos badges
const priorityMap = {
  alta: { label: 'Alta', variant: 'destructive' as const },
  media: { label: 'Média', variant: 'default' as const },
  baixa: { label: 'Baixa', variant: 'secondary' as const },
  urgente: { label: 'Urgente', variant: 'destructive' as const },
};

// Map para status das tarefas
const statusMap: Record<TaskStatus, string> = {
  pendente: 'backlog',
  a_fazer: 'todo',
  em_andamento: 'inProgress',
  em_revisao: 'review',
  concluido: 'done'
};

// Map reverso para converter de coluna para status da API
const columnToStatusMap: Record<string, TaskStatus> = {
  backlog: 'pendente',
  todo: 'a_fazer',
  inProgress: 'em_andamento',
  review: 'em_revisao',
  done: 'concluido',
  // Colunas de data não têm mapeamento direto para status
  overdue: 'a_fazer',
  today: 'em_andamento',
  tomorrow: 'a_fazer'
};

// Ordem das colunas para o modo de status
const statusColumnOrder = ['backlog', 'todo', 'inProgress', 'review', 'done'];

// Ordem das colunas para o modo de data
const dateColumnOrder = ['overdue', 'today', 'tomorrow', 'future'];

// Interface para as colunas do Kanban
interface Column {
  id: string;
  title: string;
  taskIds: string[];
}

// Interface para o objeto de colunas
interface KanbanColumns {
  [key: string]: Column;
}

interface KanbanBoardProps {
  projectId?: number;
  teams?: any[];
  selectedTeamId?: number | null;
  onTeamChange?: (teamId: number | null) => void;
  selectedUserId?: number | null;
  onUserChange?: (userId: number | null) => void;
  viewMode?: 'status' | 'date';
  onViewModeChange?: (mode: 'status' | 'date') => void;
  priorityFilter?: string | null;
  onTasksUpdated?: () => Promise<void>;
  forceUserFilter?: boolean;
  onTasksFiltered?: (tasks: Task[]) => void;
  showCompleted?: boolean;
}

// Componente para renderizar uma tarefa
const TaskCard = ({
  task,
  onClick,
  onTaskStatusChange,
  timerRunningTaskId,
  setTimerRunningTaskId,
  onTimerUpdate
}: {
  task: Task,
  onClick: () => void,
  onTaskStatusChange?: (taskId: number, newStatus: TaskStatus) => void,
  timerRunningTaskId: string | null,
  setTimerRunningTaskId: (id: string | null) => void,
  onTimerUpdate?: (seconds: number) => void
}) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';

    // Usar a abordagem de comparação por string para evitar problemas de fuso horário
    const date = new Date(dateString);
    const dateStr = date.toISOString().split('T')[0];

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (dateStr === todayStr) {
      return 'Hoje';
    } else if (dateStr === tomorrowStr) {
      return 'Amanhã';
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  // Obter o nome do projeto
  const projectName = task.project ? task.project.title : `Projeto ${task.project_id}`;

  // Função para atualizar o status da tarefa quando o temporizador é iniciado/pausado
  const handleStatusChange = async (status: string) => {
    try {
      // Mapear o status do temporizador para o status da API
      let apiStatus: TaskStatus = 'em_andamento';
      if (status === 'Pausado') {
        apiStatus = 'a_fazer';
      }

      // Atualizar o status da tarefa na API
      await taskService.updateTask(task.id, { status: apiStatus });

      // Mostrar toast de confirmação
      toast.success(`Status da tarefa atualizado para ${status}`);

      // Notificar o componente pai sobre a mudança de status para atualizar o estado local
      if (onTaskStatusChange) {
        onTaskStatusChange(task.id, apiStatus);
      }
    } catch (error) {
      console.error('Erro ao atualizar status da tarefa:', error);
      toast.error('Não foi possível atualizar o status da tarefa');
    }
  };

  // Verificar se o timer está em execução para esta tarefa
  const isTimerRunning = timerRunningTaskId === String(task.id);

  // Verificar se o status da tarefa é "em_andamento"
  const isInProgress = task.status === 'em_andamento';

  // Adicionar uma classe especial para destacar visualmente tarefas em andamento com timer ativo
  const cardClasses = `p-2 mb-2 bg-background rounded-md border shadow-sm
    ${isTimerRunning ? 'border-green-400 shadow-green-100' : ''}
    ${isInProgress && !isTimerRunning ? 'border-yellow-400' : ''}`;

  return (
    <div
      className={cardClasses}
      onClick={onClick}
    >
      {/* Projeto */}
      <div className="text-xs text-muted-foreground mb-1">
        <Briefcase className="h-3 w-3 inline-block mr-1" />
        {projectName}
      </div>

      {/* Nome da tarefa */}
      <h4 className="text-sm font-medium mb-2">
        {isTimerRunning && (
          <Timer className="h-3 w-3 inline-block mr-1 text-green-500" />
        )}
        {task.title}
      </h4>

      {/* Linha única com usuário, data e prioridade */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {/* Ícone do usuário */}
        <div className="flex -space-x-2 mr-1">
          {task.users && task.users.length > 0 ? (
            <>
              {task.users.slice(0, 1).map((user, index) => {
                const userId = typeof user === 'object' ? user.id : user;
                const userName = typeof user === 'object' ? user.name : `User ${userId}`;
                const initials = userName && userName.includes(' ') ?
                  userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) :
                  (userName ? userName.substring(0, 2).toUpperCase() : 'U' + userId);

                return (
                  <Avatar key={index} className="h-5 w-5 border-2 border-background">
                    <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                );
              })}

              {task.users.length > 1 && (
                <Avatar className="h-5 w-5 border-2 border-background bg-muted">
                  <AvatarFallback className="text-[8px] text-muted-foreground">
                    +{task.users.length - 1}
                  </AvatarFallback>
                </Avatar>
              )}
            </>
          ) : (
            <Avatar className="h-5 w-5 border-2 border-background">
              <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                ?
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Data de vencimento */}
        {task.due_date && (
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(task.due_date)}
          </div>
        )}

        {/* Linha inferior com prioridade e temporizador */}
        <div className="flex items-center justify-between pt-1">
          {/* Prioridade */}
          <Badge variant={priorityMap[task.priority]?.variant || 'default'} className="text-[9px] px-1 py-0 h-4 mr-3">
            {priorityMap[task.priority]?.label || 'Média'}
          </Badge>

          {/* Temporizador */}
          <div className="flex-shrink-0">
            <TaskTimer
              taskId={String(task.id)}
              initialTime={task.timer || 0}
              isRunning={isTimerRunning}
              compact={true}
              onStatusChange={(status) => {
                // Atualizar o estado do timer em execução
                if (status === "Em Andamento") {
                  setTimerRunningTaskId(String(task.id));
                } else {
                  setTimerRunningTaskId(null);
                }

                // Chamar o handler original
                handleStatusChange(status);
              }}
              onTimerUpdate={onTimerUpdate || ((seconds) => {
                // Se não foi passado um onTimerUpdate, usar esta implementação padrão

                // Criar objeto de atualização explicitamente
                const updateData = {
                  timer: seconds
                };

                // Mostrar toast de informação
                toast.info('Atualizando tempo da tarefa...');

                taskService.updateTask(task.id, updateData)
                  .then(response => {
                    toast.success('Tempo da tarefa atualizado com sucesso!');

                    // Atualizar o estado local da tarefa com o valor retornado da API
                    if (response && response.timer !== undefined) {
                      // Criar uma cópia do objeto de tarefas (para o componente pai)
                      if (onTaskStatusChange) {
                        // Notificar o componente pai sobre a mudança para atualizar o estado local
                        // Usamos o mesmo método que é usado para atualizar o status
                        onTaskStatusChange(task.id, task.status);
                      }
                    }
                  })
                  .catch(err => {
                    console.error('Erro ao atualizar timer da tarefa:', err);
                    toast.error('Erro ao atualizar timer');
                  });
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para renderizar uma tarefa arrastável
const SortableTaskCard = ({
  id,
  task,
  onClick,
  onTaskStatusChange,
  timerRunningTaskId,
  setTimerRunningTaskId,
  onTimerUpdate
}: {
  id: string,
  task: Task,
  onClick: () => void,
  onTaskStatusChange?: (taskId: number, newStatus: TaskStatus) => void,
  timerRunningTaskId: string | null,
  setTimerRunningTaskId: (id: string | null) => void,
  onTimerUpdate?: (seconds: number) => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`touch-none ${isDragging ? 'ring-2 ring-primary/50' : ''}`}
    >
      <TaskCard
        task={task}
        onClick={onClick}
        onTaskStatusChange={onTaskStatusChange}
        timerRunningTaskId={timerRunningTaskId}
        setTimerRunningTaskId={setTimerRunningTaskId}
        onTimerUpdate={onTimerUpdate}
      />
    </div>
  );
};

// Componente para área droppable
const DroppableColumn = ({ id, children }: { id: string, children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({
    id
  });

  // Log quando o mouse está sobre a coluna
  React.useEffect(() => {
    if (isOver) {
    }
  }, [isOver, id]);

  return (
    <div
      ref={setNodeRef}
      className={`p-2 flex-1 overflow-y-auto min-h-[50px] transition-colors duration-200 ${isOver ? 'bg-accent/20 ring-2 ring-accent/50' : ''}`}
      data-droppable-id={id}
    >
      {children}
    </div>
  );
};

// Componente para renderizar uma coluna
const Column = ({
  column,
  tasks,
  onAddTask,
  onTaskClick,
  onTaskStatusChange,
  id,
  timerRunningTaskId,
  setTimerRunningTaskId,
  onTimerUpdate
}: {
  column: Column,
  tasks: Task[],
  onAddTask: (columnId: string) => void,
  onTaskClick: (taskId: number) => void,
  onTaskStatusChange?: (taskId: number, newStatus: TaskStatus) => void,
  id: string,
  timerRunningTaskId: string | null,
  setTimerRunningTaskId: (id: string | null) => void,
  onTimerUpdate?: (seconds: number) => void
}) => {
  // Hook de permissões
  const permissions = usePermissions();
  return (
    <div
      className="kanban-column flex-1 min-w-[200px] bg-card flex flex-col border rounded-lg overflow-hidden"
      data-column-id={id}
    >
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center">
            {column.title}
            <span className="ml-2 text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">
              {tasks.length}
            </span>
          </h3>
          <div className="flex items-center gap-1">
            {!permissions.isMember && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddTask(id)}>
                <PlusCircle className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <DroppableColumn id={id}>
        <SortableContext
          items={tasks.map(task => String(task.id))}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map(task => (
            <SortableTaskCard
              key={String(task.id)}
              id={String(task.id)}
              task={task}
              onClick={() => onTaskClick(task.id)}
              onTaskStatusChange={onTaskStatusChange}
              timerRunningTaskId={timerRunningTaskId}
              setTimerRunningTaskId={setTimerRunningTaskId}
              onTimerUpdate={onTimerUpdate}
            />
          ))}
        </SortableContext>
      </DroppableColumn>
    </div>
  );
};

export const KanbanBoard = React.forwardRef<{ fetchTasks: () => Promise<void> }, KanbanBoardProps>(({
  projectId,
  teams: propTeams,
  selectedTeamId: propSelectedTeamId,
  onTeamChange,
  selectedUserId: propSelectedUserId,
  onUserChange,
  viewMode = 'status',
  onViewModeChange,
  priorityFilter,
  onTasksUpdated,
  forceUserFilter,
  onTasksFiltered, // Adiciona a nova prop aqui
  showCompleted
}, ref) => {
  // Hooks de autenticação e permissões
  const { user } = useAuth();
  const permissions = usePermissions();
  // Colunas para visualização por status
  const statusColumns: KanbanColumns = {
    backlog: { id: 'backlog', title: 'Pendente', taskIds: [] },
    todo: { id: 'todo', title: 'A Fazer', taskIds: [] },
    inProgress: { id: 'inProgress', title: 'Em Andamento', taskIds: [] },
    review: { id: 'review', title: 'Em Revisão', taskIds: [] },
    done: { id: 'done', title: 'Concluído', taskIds: [] },
  };

  // Colunas para visualização por data
  const dateColumns: KanbanColumns = {
    overdue: { id: 'overdue', title: 'Atrasadas', taskIds: [] },
    today: { id: 'today', title: 'Hoje', taskIds: [] },
    tomorrow: { id: 'tomorrow', title: 'Amanhã', taskIds: [] },
    future: { id: 'future', title: 'Futuras', taskIds: [] },
  };

  // Estado para as colunas atuais
  const [columns, setColumns] = useState<KanbanColumns>(viewMode === 'status' ? { ...statusColumns } : { ...dateColumns });


  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Estados para o modal de detalhes da tarefa
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [timerRunningTaskId, setTimerRunningTaskId] = useState<string | null>(null); // ID da tarefa com timer em execução
  const [currentTimerValues, setCurrentTimerValues] = useState<Record<string, number>>({}); // Valores atuais dos timers

  // Estado para o diálogo de adicionar tarefa
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);

// Log do estado do modal de adicionar tarefa e coluna selecionada
useEffect(() => {
  console.log('[KanbanBoard] Estado modal adicionar tarefa:', { isDialogOpen, selectedColumnId });
}, [isDialogOpen, selectedColumnId]);


  // Configurar sensores para o drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Distância mínima para iniciar o arrasto
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Efeito para limpar o estado quando o projectId muda
  // Removido para evitar chamadas duplicadas - agora o ProjectView é responsável por chamar fetchTasks
  // quando o projectId muda, e fetchTasks já limpa o estado antes de carregar novas tarefas

  // Função para carregar tarefas da API
  const fetchTasks = useCallback(async () => {
    console.log('[KanbanBoard][fetchTasks] Iniciando fetch de tarefas');
    setLoading(true);
    setError(null);


    try {
      // Limpar o estado das tarefas e colunas antes de carregar novas
      setTasks({});

      // Redefinir as colunas com base no modo de visualização atual
      const emptyColumns = viewMode === 'status'
        ? {
            backlog: { id: 'backlog', title: 'Pendente', taskIds: [] },
            todo: { id: 'todo', title: 'A Fazer', taskIds: [] },
            inProgress: { id: 'inProgress', title: 'Em Andamento', taskIds: [] },
            review: { id: 'review', title: 'Em Revisão', taskIds: [] },
            done: { id: 'done', title: 'Concluído', taskIds: [] }
          }
        : {
            overdue: { id: 'overdue', title: 'Atrasadas', taskIds: [] },
            today: { id: 'today', title: 'Hoje', taskIds: [] },
            tomorrow: { id: 'tomorrow', title: 'Amanhã', taskIds: [] },
            future: { id: 'future', title: 'Futuras', taskIds: [] }
          };

      setColumns(emptyColumns);

      // Carregar tarefas do projeto ou todas as tarefas
      const tasksList = projectId
        ? await taskService.getTasksByProject(projectId)
        : await taskService.getTasks();



      // Filtrar tarefas por equipe se houver uma equipe selecionada
      let filteredTasks = tasksList;

      if (propSelectedTeamId) {
        filteredTasks = filteredTasks.filter(task => {
          // Verificar se a tarefa tem ocupações (equipes) e se a equipe selecionada está entre elas
          if (!task.occupations) return false;

          // Verificar se occupations é um array de objetos ou de IDs
          return task.occupations.some(occupation => {
            if (typeof occupation === 'number') {
              return occupation === propSelectedTeamId;
            } else {
              return occupation.id === propSelectedTeamId;
            }
          });
        });
      }

      // Filtrar tarefas por usuário responsável (selecionado ou usuário atual se for membro)
      let userIdToFilter = propSelectedUserId;

      // Se o usuário for um membro ou se forceUserFilter for true, forçar a filtragem pelo ID do usuário logado
      // Mas não aplicar o filtro se forceUserFilter for explicitamente false

      if ((permissions.isMember && forceUserFilter !== false) || forceUserFilter === true) {
        // Obter o ID do usuário do localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            userIdToFilter = parsedUser.id;

          } catch (e) {
            console.error('Erro ao obter ID do usuário do localStorage:', e);
          }
        } else {
          // Tentar obter o ID do usuário do contexto de autenticação
          if (user && user.id) {
            userIdToFilter = user.id;
          }
        }
      }

      if (userIdToFilter) {

        filteredTasks = filteredTasks.filter(task => {
          // Verificar se a tarefa tem usuários e se o usuário selecionado está entre eles
          if (!task.users || !Array.isArray(task.users) || task.users.length === 0) return false;

          // Verificar se users é um array de objetos ou de IDs
          return task.users.some(taskUser => {
            if (typeof taskUser === 'number') {
              return taskUser === userIdToFilter;
            } else {
              return taskUser.id === userIdToFilter;
            }
          });
        });

      }

      // Aplicar filtro de prioridade
      if (priorityFilter) {

        filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
      }
 
      // Aplicar filtro de tarefas concluídas
      if (!showCompleted) {
        console.log('KanbanBoard: Aplicando filtro para ocultar tarefas concluídas.');
        filteredTasks = filteredTasks.filter(task => task.status !== 'concluido');
        console.log('KanbanBoard: Tarefas após filtro de concluídas:', filteredTasks.length);
      }

      // Chamar o callback com as tarefas filtradas ANTES de processá-las
      if (onTasksFiltered) {
        onTasksFiltered(filteredTasks);
      }

      // Transformar array de tarefas em objeto para facilitar acesso
      const tasksMap: Record<string, Task> = {};
      filteredTasks.forEach(task => {
        const taskId = String(task.id);
        // Verificar se a tarefa pertence ao projeto atual
        const taskProjectId = Number(task.project_id || task.projectId);
        const currentProjectId = Number(projectId);


        if (!currentProjectId || taskProjectId === currentProjectId) {
          tasksMap[taskId] = task;
        } else {

        }
      });

      setTasks(tasksMap);

      // Criar uma cópia das colunas atuais para preservar a estrutura
      // Usar o estado atual das colunas como base
      const taskColumns: KanbanColumns = {};

      // Garantir que estamos usando o modo de visualização correto
      if (viewMode === 'status') {
        // Colunas para modo de status
        taskColumns.backlog = { id: 'backlog', title: 'Pendente', taskIds: [] };
        taskColumns.todo = { id: 'todo', title: 'A Fazer', taskIds: [] };
        taskColumns.inProgress = { id: 'inProgress', title: 'Em Andamento', taskIds: [] };
        taskColumns.review = { id: 'review', title: 'Em Revisão', taskIds: [] };
        taskColumns.done = { id: 'done', title: 'Concluído', taskIds: [] };
      } else {
        // Colunas para modo de data
        taskColumns.overdue = { id: 'overdue', title: 'Atrasadas', taskIds: [] };
        taskColumns.today = { id: 'today', title: 'Hoje', taskIds: [] };
        taskColumns.tomorrow = { id: 'tomorrow', title: 'Amanhã', taskIds: [] };
        taskColumns.future = { id: 'future', title: 'Futuras', taskIds: [] };
      }



      // Distribuir tarefas nas colunas de acordo com o modo de visualização
      // Primeiro, vamos criar um mapa para armazenar as tarefas por coluna com suas datas
      const tasksByColumn: Record<string, Array<{id: string, dueDate: Date | null}>> = {};

      // Inicializar o mapa para todas as colunas
      Object.keys(taskColumns).forEach(columnId => {
        tasksByColumn[columnId] = [];
      });

      // Distribuir tarefas nas colunas
      filteredTasks.forEach(task => {
        if (viewMode === 'status') {
          // Mapear o status da API para a coluna correspondente
          const columnId = statusMap[task.status] || 'todo';
          if (taskColumns[columnId]) {
            // Para o modo de status, não precisamos ordenar por data
            taskColumns[columnId].taskIds.push(String(task.id));
          }
        } else {
          // Modo de visualização por data
          // Verificar se a tarefa tem data de vencimento
          let dueDate: Date | null = null;
          let columnId = 'today'; // Coluna padrão se não tiver data

          if (task.due_date) {
            // Usar a abordagem de comparação por string para evitar problemas de fuso horário
            const dueDate = new Date(task.due_date);
            const dueDateStr = dueDate.toISOString().split('T')[0];

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];



            if (dueDateStr < todayStr) {
              // Tarefa atrasada
              columnId = 'overdue';

            } else if (dueDateStr === todayStr) {
              // Tarefa para hoje
              columnId = 'today';

            } else if (dueDateStr === tomorrowStr) {
              // Tarefa para amanhã
              columnId = 'tomorrow';

            } else {
              // Tarefas futuras (após amanhã) vão para 'future'
              columnId = 'future';

            }
          }



          // Verificar se a coluna existe antes de adicionar a tarefa
          if (taskColumns[columnId]) {
            // Adicionar a tarefa ao mapa com sua data de vencimento
            tasksByColumn[columnId].push({
              id: String(task.id),
              dueDate: dueDate
            });
          } else {

            // Adicionar à coluna 'today' como fallback
            if (taskColumns['today']) {
              tasksByColumn['today'].push({
                id: String(task.id),
                dueDate: dueDate
              });
            }
          }
        }
      });

      // Se estamos no modo de data, ordenar as tarefas por data e adicionar às colunas
      if (viewMode === 'date') {
        // Ordenar tarefas atrasadas da mais antiga para a mais recente (mais urgente primeiro)
        tasksByColumn['overdue'].sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          // Usar toISOString para garantir comparação consistente
          return a.dueDate.toISOString().localeCompare(b.dueDate.toISOString());
        });

        // Tarefas de hoje e amanhã têm a mesma data dentro de cada coluna, não precisam ser ordenadas

        // Ordenar tarefas futuras da mais recente para a mais antiga (mais próxima primeiro)
        tasksByColumn['future'].sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          // Usar toISOString para garantir comparação consistente
          return a.dueDate.toISOString().localeCompare(b.dueDate.toISOString());
        });

        // Adicionar as tarefas ordenadas às colunas
        Object.keys(tasksByColumn).forEach(columnId => {
          taskColumns[columnId].taskIds = tasksByColumn[columnId].map(task => task.id);
        });
      }



      // Verificar se as colunas correspondem ao modo atual
      const expectedColumnIds = viewMode === 'status' ? statusColumnOrder : dateColumnOrder;
      const actualColumnIds = Object.keys(taskColumns);

      const hasCorrectColumns = expectedColumnIds.every(id => actualColumnIds.includes(id));

      if (!hasCorrectColumns) {

        // Não atualizar as colunas se elas não corresponderem ao modo atual
        return;
      }

      setColumns(taskColumns);
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err);
      setError('Não foi possível carregar as tarefas. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }, [projectId, propSelectedTeamId, propSelectedUserId, viewMode, priorityFilter, forceUserFilter, user?.id, permissions.isMember, showCompleted]); // Adicionado showCompleted

  // Efeito para forçar a atualização das tarefas quando a página é carregada
  useEffect(() => {
    // Pequeno delay para garantir que o estado foi atualizado
    const timer = setTimeout(() => {
      fetchTasks();
    }, 300); // 300ms de delay

    return () => clearTimeout(timer);
  }, []);

  // Expor o método fetchTasks através da referência
  useImperativeHandle(ref, () => ({
    fetchTasks: fetchTasks // Expor diretamente a função definida com useCallback
  }));

  // Efeito inicial para carregar tarefas
  // Removido para evitar chamadas duplicadas, já que agora temos um efeito específico para projectId
  // useEffect(() => {
  //   fetchTasks();
  // }, [fetchTasks]);

  // Atualizar colunas quando o modo de visualização mudar
  useEffect(() => {
    // Quando o modo de visualização muda, recarregar as tarefas
    // para garantir que elas sejam distribuídas corretamente
    fetchTasks();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // Efeito para atualizar o valor atual do timer quando ele está em execução
  useEffect(() => {
    if (!timerRunningTaskId) return;

    // Verificar se já temos um valor inicial para o timer
    if (!currentTimerValues[timerRunningTaskId]) {
      // Se não temos, usar o valor do timer da tarefa
      const task = tasks[timerRunningTaskId];
      if (task) {
        setCurrentTimerValues(prev => ({
          ...prev,
          [timerRunningTaskId]: task.timer || 0
        }));
      }
    }

    // Criar um intervalo para incrementar o timer a cada segundo
    const interval = setInterval(() => {
      setCurrentTimerValues(prev => {
        const currentValue = prev[timerRunningTaskId] || 0;
        return {
          ...prev,
          [timerRunningTaskId]: currentValue + 1
        };
      });
    }, 1000);

    // Limpar o intervalo quando o componente for desmontado ou o timer parar
    return () => {
      clearInterval(interval);
    };
  }, [timerRunningTaskId, tasks]); // Removido currentTimerValues das dependências para evitar loop

  // Função chamada quando o usuário começa a arrastar um item
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(String(active.id));
  };

  // Função para encontrar a coluna que contém um determinado ID de tarefa
  const findColumnOfTask = (taskId: string): string | null => {
    for (const [columnId, column] of Object.entries(columns)) {
      if (column.taskIds.includes(taskId)) {
        return columnId;
      }
    }
    return null;
  };

  // Função chamada quando o usuário termina de arrastar um item
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;


    if (!over) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);


    if (activeId === overId) {
      return;
    }

    const sourceColumnId = findColumnOfTask(activeId);
    if (!sourceColumnId) {
      return;
    }

    // Verificar se o overId é uma coluna ou uma tarefa
    let destinationColumnId = overId;
    if (!(overId in columns)) {
      // Se não for uma coluna, encontrar a coluna que contém a tarefa
      destinationColumnId = findColumnOfTask(overId) || sourceColumnId;

    }



    // Verificar se estamos movendo entre colunas ou dentro da mesma coluna
    if (sourceColumnId !== destinationColumnId) {
      // Movendo para outra coluna
      const sourceColumn = columns[sourceColumnId];
      const destinationColumn = columns[destinationColumnId];

      // Remover da coluna de origem
      const newSourceTaskIds = sourceColumn.taskIds.filter(id => id !== activeId);

      // Adicionar à coluna de destino
      const newDestinationTaskIds = [...destinationColumn.taskIds, activeId];

      // Atualizar o estado
      const newColumns = {
        ...columns,
        [sourceColumnId]: {
          ...sourceColumn,
          taskIds: newSourceTaskIds
        },
        [destinationColumnId]: {
          ...destinationColumn,
          taskIds: newDestinationTaskIds
        }
      };

      setColumns(newColumns);

      // Atualizar a tarefa na API
      try {
        const taskId = parseInt(activeId);
        const currentTask = tasks[activeId];

        if (!currentTask) {
          toast.error('Tarefa não encontrada.');
          setColumns(columns); // Reverter mudanças
          return;
        }

        // Preparar os dados para atualização
        // Incluir campos obrigatórios para garantir que a validação passe
        const updateData: any = {
          title: currentTask.title,
          priority: currentTask.priority,
          start_date: currentTask.start_date,
          due_date: currentTask.due_date,
          project_id: currentTask.project_id
        };

        if (viewMode === 'status') {
          // No modo de status, atualizar o status da tarefa
          const newStatus = columnToStatusMap[destinationColumnId];
          updateData.status = newStatus;
        } else {
          // No modo de data, atualizar a data de vencimento da tarefa
          const today = new Date();
          // Definir a hora para meio-dia para evitar problemas de fuso horário
          today.setHours(12, 0, 0, 0);

          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          if (destinationColumnId === 'today') {
            updateData.dueDate = today.toISOString();

          } else if (destinationColumnId === 'tomorrow') {
            updateData.dueDate = tomorrow.toISOString();

          } else if (destinationColumnId === 'overdue') {
            // Para tarefas atrasadas, definir a data para ontem
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            updateData.dueDate = yesterday.toISOString();

          } else if (destinationColumnId === 'future') {
            // Para tarefas futuras, definir a data para 2 dias a partir de hoje
            const futureDays = new Date(today);
            futureDays.setDate(futureDays.getDate() + 2);
            updateData.dueDate = futureDays.toISOString();

          }
        }

        const updatedTask = await taskService.updateTask(taskId, updateData);

        // Notificar o componente pai sobre a atualização das tarefas
        if (onTasksUpdated) {
          await onTasksUpdated();
        }

        // Atualizar o estado local
        const updatedTasksMap = { ...tasks };
        if (viewMode === 'status' && updateData.status) {
          updatedTasksMap[activeId] = { ...updatedTasksMap[activeId], status: updateData.status };

          // Verificar se o status foi alterado para "em_andamento"
          if (updateData.status === 'em_andamento') {
            // Iniciar o timer
            setTimerRunningTaskId(activeId);

            // Inicializar o valor atual do timer
            setCurrentTimerValues(prev => ({
              ...prev,
              [activeId]: updatedTasksMap[activeId].timer || 0
            }));
          } else if (timerRunningTaskId === activeId && updateData.status !== 'em_andamento') {
            // Se o timer estiver em execução para esta tarefa e o status for alterado para algo diferente de "em_andamento", parar o timer

            // Obter o valor atual do timer
            const currentTimerValue = currentTimerValues[activeId] || updatedTasksMap[activeId].timer || 0;

            // Atualizar o timer na API
            const timerUpdateData = {
              timer: currentTimerValue
            };

            // Mostrar toast de informação
            toast.info('Atualizando tempo da tarefa...');

            // Atualizar o timer na API
            taskService.updateTask(parseInt(activeId), timerUpdateData)
              .then(response => {
                toast.success('Tempo da tarefa atualizado com sucesso!');

                // Atualizar o valor do timer no estado local
                if (response && response.timer !== undefined) {
                  setCurrentTimerValues(prev => ({
                    ...prev,
                    [activeId]: response.timer
                  }));

                  // Atualizar o timer na tarefa
                  updatedTasksMap[activeId] = {
                    ...updatedTasksMap[activeId],
                    timer: response.timer
                  };
                }
              })
              .catch(err => {
                toast.error('Erro ao atualizar timer');
              });

            // Parar o timer
            setTimerRunningTaskId(null);
          }
        } else if (updateData.dueDate) {
          // Atualizar o campo due_date no estado local (formato interno)
          updatedTasksMap[activeId] = { ...updatedTasksMap[activeId], due_date: updateData.dueDate };
        }
        setTasks(updatedTasksMap);

        toast.success(`Tarefa movida para ${destinationColumn.title}`);
      } catch (err) {
        toast.error('Erro ao atualizar status da tarefa. Tente novamente.');

        // Reverter as mudanças no estado local em caso de erro
        setColumns(columns);
      }
    } else {
      // Movendo dentro da mesma coluna
      const sourceColumn = columns[sourceColumnId];
      const currentIndex = sourceColumn.taskIds.indexOf(activeId);
      const overTaskId = findTaskIdFromOver(over);

      if (!overTaskId || currentIndex === -1) return;

      const destinationIndex = sourceColumn.taskIds.indexOf(overTaskId);
      if (destinationIndex === -1) return;

      // Reordenar os IDs das tarefas
      const newTaskIds = arrayMove(sourceColumn.taskIds, currentIndex, destinationIndex);

      // Se estamos no modo de data e a coluna é 'overdue' ou 'future', reordenar por data
      if (viewMode === 'date' && (sourceColumnId === 'overdue' || sourceColumnId === 'future')) {
        // Obter as tarefas com suas datas
        const tasksWithDates = newTaskIds.map(taskId => {
          const task = tasks[taskId];
          let dueDate = null;
          if (task && task.due_date) {
            dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);
          }
          return { id: taskId, dueDate };
        });

        // Ordenar por data
        tasksWithDates.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          // Usar toISOString para garantir comparação consistente
          return a.dueDate.toISOString().localeCompare(b.dueDate.toISOString());
        });

        // Atualizar os IDs das tarefas ordenadas
        const orderedTaskIds = tasksWithDates.map(task => task.id);

        // Atualizar o estado
        const newColumns = {
          ...columns,
          [sourceColumnId]: {
            ...sourceColumn,
            taskIds: orderedTaskIds
          }
        };

        setColumns(newColumns);

        // Mostrar mensagem informativa
        if (sourceColumnId === 'overdue' || sourceColumnId === 'future') {
          toast.info(`As tarefas na coluna ${sourceColumn.title} foram reordenadas por data.`);
        }
      } else {
        // Para outras colunas ou modo de status, manter a ordem definida pelo usuário
        const newColumns = {
          ...columns,
          [sourceColumnId]: {
            ...sourceColumn,
            taskIds: newTaskIds
          }
        };

        setColumns(newColumns);
      }
    }
  };

  // Função para encontrar o ID da tarefa a partir do objeto over
  const findTaskIdFromOver = (over: any): string | null => {
    // Se o over.id é uma coluna, retorna null
    if (over.id in columns) return null;

    // Caso contrário, o over.id é o ID da tarefa
    return String(over.id);
  };

  const handleTaskClick = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsTaskModalOpen(true);
  };

  const handleTaskModalClose = () => {
    setIsTaskModalOpen(false);
    setSelectedTaskId(null);
  };

  const handleTaskUpdated = async () => {
    // Notificar o componente pai sobre a atualização das tarefas
    if (onTasksUpdated) {
      await onTasksUpdated();
    }

    // Primeiro, recarregar todas as tarefas para garantir que temos os dados mais recentes
    await fetchTasks();

    // Se temos uma tarefa selecionada, verificar se precisamos atualizar o timer e a posição do card
    if (selectedTaskId) {
      // Buscar a tarefa atualizada diretamente da API para garantir que temos os dados mais recentes
      try {
        const updatedTask = await taskService.getTask(selectedTaskId);

        const taskIdStr = String(selectedTaskId);

        // Sempre atualizar o estado local da tarefa com os dados mais recentes
        const updatedTasks = { ...tasks };
        updatedTasks[taskIdStr] = {
          ...updatedTasks[taskIdStr],
          ...updatedTask
        };
        setTasks(updatedTasks);

        // Sempre atualizar o valor do timer no estado global
        // Isso é crucial para garantir que o valor exibido no KanbanBoard seja o mesmo que estava no modal
        setCurrentTimerValues(prev => ({
          ...prev,
          [taskIdStr]: updatedTask.timer || 0
        }));

        // Verificar se a tarefa está em modo "em_andamento"
        if (updatedTask && updatedTask.status === 'em_andamento') {
          // Atualizar o timerRunningTaskId para iniciar o timer
          setTimerRunningTaskId(taskIdStr);
        } else if (updatedTask && updatedTask.status !== 'em_andamento' && timerRunningTaskId === taskIdStr) {
          // Se a tarefa não está mais em andamento e o timer está em execução, parar o timer
          setTimerRunningTaskId(null);
        }
      } catch (error) {
        toast.error('Erro ao buscar tarefa');
      }
    }

    // Verificar todas as tarefas e atualizar suas posições no modo de visualização por status
    if (viewMode === 'status') {
      // Criar uma cópia das colunas
      const updatedColumns = { ...columns };
      let columnsChanged = false;

      // Para cada tarefa, verificar se está na coluna correta
      Object.entries(tasks).forEach(([taskIdStr, task]) => {
        // Encontrar a coluna atual da tarefa
        const currentColumnId = findColumnOfTask(taskIdStr);

        // Encontrar a coluna correta com base no status da tarefa
        const correctColumnId = statusMap[task.status];

        // Se a tarefa estiver na coluna errada, movê-la para a coluna correta
        if (currentColumnId && correctColumnId && currentColumnId !== correctColumnId) {
          // Remover a tarefa da coluna atual
          updatedColumns[currentColumnId] = {
            ...updatedColumns[currentColumnId],
            taskIds: updatedColumns[currentColumnId].taskIds.filter(id => id !== taskIdStr)
          };

          // Adicionar a tarefa à coluna correta
          updatedColumns[correctColumnId] = {
            ...updatedColumns[correctColumnId],
            taskIds: [...updatedColumns[correctColumnId].taskIds, taskIdStr]
          };

          columnsChanged = true;
        }
      });

      // Se houve alterações nas colunas, atualizar o estado
      if (columnsChanged) {
        setColumns(updatedColumns);
      }
    }
  };

  // Função para atualizar o timer de uma tarefa
  const handleTimerUpdate = (seconds: number) => {
    if (!timerRunningTaskId) return;

    // Garantir que o valor seja um número válido
    const timerValue = Number(seconds);

    if (isNaN(timerValue)) {
      toast.error('Erro ao processar o tempo. Usando valor padrão.');
      return; // Não prosseguir com a atualização
    }

    // Atualizar o valor atual do timer para esta tarefa
    setCurrentTimerValues(prev => ({
      ...prev,
      [timerRunningTaskId]: timerValue
    }));

    // Atualizar o estado local da tarefa
    if (tasks[timerRunningTaskId]) {
      // Criar uma cópia do objeto de tarefas
      const updatedTasks = { ...tasks };
      // Atualizar o timer da tarefa
      updatedTasks[timerRunningTaskId] = {
        ...updatedTasks[timerRunningTaskId],
        timer: timerValue
      };
      // Atualizar o estado
      setTasks(updatedTasks);
    }

    // Criar objeto de atualização explicitamente
    const updateData = {
      timer: timerValue
    };

    // Mostrar toast de informação
    toast.info('Atualizando tempo da tarefa...');

    // Obter o ID da tarefa como número
    const taskId = Number(timerRunningTaskId);

    taskService.updateTask(taskId, updateData)
      .then(response => {
        toast.success('Tempo da tarefa atualizado com sucesso!');

        // Garantir que o estado local seja atualizado com o valor retornado da API
        if (response && response.timer !== undefined) {
          // Atualizar o valor atual do timer para esta tarefa
          setCurrentTimerValues(prev => ({
            ...prev,
            [timerRunningTaskId]: response.timer
          }));

          // Atualizar o estado local da tarefa
          if (tasks[timerRunningTaskId]) {
            // Criar uma cópia do objeto de tarefas
            const updatedTasks = { ...tasks };
            // Atualizar o timer da tarefa com o valor retornado da API
            updatedTasks[timerRunningTaskId] = {
              ...updatedTasks[timerRunningTaskId],
              timer: response.timer
            };
            // Atualizar o estado
            setTasks(updatedTasks);
          }
        }
      })
      .catch(err => {
        toast.error('Erro ao atualizar timer');
      });
  };

  // Função para lidar com a mudança de status de uma tarefa pelo temporizador
  const handleTaskStatusChange = (taskId: number, newStatus: TaskStatus) => {

    // Atualizar o estado local da tarefa
    const taskIdStr = String(taskId);
    if (tasks[taskIdStr]) {
      // Criar uma cópia do objeto de tarefas
      const updatedTasks = { ...tasks };

      // Preservar o valor atual do timer e outros campos
      const currentTask = tasks[taskIdStr];

      // Atualizar o status da tarefa mantendo todos os outros campos
      updatedTasks[taskIdStr] = {
        ...currentTask,
        status: newStatus
      };

      // Atualizar o estado
      setTasks(updatedTasks);

      // Mover a tarefa para a coluna correta
      if (viewMode === 'status') {
        // Encontrar a coluna atual da tarefa
        const currentColumnId = findColumnOfTask(taskIdStr);
        // Encontrar a nova coluna com base no status
        const newColumnId = statusMap[newStatus];

        if (currentColumnId && newColumnId && currentColumnId !== newColumnId) {
          // Criar uma cópia das colunas
          const updatedColumns = { ...columns };

          // Remover a tarefa da coluna atual
          updatedColumns[currentColumnId] = {
            ...updatedColumns[currentColumnId],
            taskIds: updatedColumns[currentColumnId].taskIds.filter(id => id !== taskIdStr)
          };

          // Adicionar a tarefa à nova coluna
          updatedColumns[newColumnId] = {
            ...updatedColumns[newColumnId],
            taskIds: [...updatedColumns[newColumnId].taskIds, taskIdStr]
          };

          // Atualizar o estado das colunas
          setColumns(updatedColumns);


        }
      }

      // Forçar a atualização do timer no estado local
      if (currentTask.timer !== undefined) {
        // Atualizar o valor atual do timer para esta tarefa
        setCurrentTimerValues(prev => ({
          ...prev,
          [taskIdStr]: currentTask.timer || 0
        }));
      }

      // Se o status for alterado para "em_andamento", iniciar o timer automaticamente
      if (newStatus === 'em_andamento') {
        setTimerRunningTaskId(taskIdStr);
      } else if (timerRunningTaskId === taskIdStr) { // Removido '&& newStatus !== "em_andamento"' (redundante)
        // Se o timer estiver em execução para esta tarefa e o status for alterado para algo diferente de "em_andamento", parar o timer

        // Obter o valor atual do timer
        const currentTimerValue = currentTimerValues[taskIdStr] || currentTask.timer || 0;

        // Atualizar o timer na API
        const timerUpdateData = {
          timer: currentTimerValue
        };

        // Mostrar toast de informação
        toast.info('Atualizando tempo da tarefa...');

        // Atualizar o timer na API
        taskService.updateTask(taskId, timerUpdateData)
          .then(response => {
            toast.success('Tempo da tarefa atualizado com sucesso!');

            // Atualizar o valor do timer no estado local
            if (response && response.timer !== undefined) {
              setCurrentTimerValues(prev => ({
                ...prev,
                [taskIdStr]: response.timer
              }));

              // Atualizar o timer na tarefa
              const updatedTasks = { ...tasks };
              updatedTasks[taskIdStr] = {
                ...updatedTasks[taskIdStr],
                timer: response.timer
              };
              setTasks(updatedTasks);
            }
          })
          .catch(err => {
            toast.error('Erro ao atualizar timer');
          });

        // Parar o timer
        setTimerRunningTaskId(null);
      }
    }
  };

  const handleTaskFormSuccess = async (taskData: any) => {
    console.log('[KanbanBoard][handleTaskFormSuccess] Dados recebidos:', taskData);
    try {
      // Criar a tarefa na API e obter a resposta
      const newTask = await taskService.createTask(taskData);
      console.log('[KanbanBoard][handleTaskFormSuccess] Nova tarefa criada:', newTask);

      setIsDialogOpen(false);
      toast.success('Tarefa criada com sucesso!');

      // Atualizar estado local: adicionar nova tarefa sem recarregar tudo
      setTasks(prev => ({ ...prev, [newTask.id]: newTask }));
      setColumns(prev => ({
        ...prev,
        [newTask.status]: {
          ...prev[newTask.status],
          taskIds: [...prev[newTask.status].taskIds, String(newTask.id)]
        }
      }));

      // Notificar o componente pai
      if (onTasksUpdated) {
        await onTasksUpdated();
      }
    } catch (error) {
      toast.error('Erro ao criar tarefa. Verifique os dados e tente novamente.');
    }
  };

  // Definir a ordem das colunas com base no modo de visualização
  const statusColumnOrder = ['backlog', 'todo', 'inProgress', 'review', 'done'];
  const dateColumnOrder = ['overdue', 'today', 'tomorrow', 'future'];
  const columnOrder = viewMode === 'status' ? statusColumnOrder : dateColumnOrder;





  if (loading) {
    return (
      <div className="h-full">
        <div className="flex gap-4 h-full overflow-x-auto pb-4">
          {columnOrder.map(columnId => (
            <div key={columnId} className="kanban-column min-w-[280px] max-w-[280px] bg-card flex flex-col border rounded-lg overflow-hidden">
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24" />
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-7 w-7 rounded-full" />
                  </div>
                </div>
              </div>

              <div className="p-2 flex-1 overflow-y-auto min-h-[50px]">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="p-3 mb-2 bg-background rounded-md border shadow-sm">
                    {/* Projeto */}
                    <div className="mb-1">
                      <Skeleton className="h-3 w-24" />
                    </div>

                    {/* Nome da tarefa */}
                    <Skeleton className="h-4 w-full mb-2" />

                    {/* Linha única com usuário, data e prioridade */}
                    <div className="flex items-center gap-2">
                      {/* Ícone do usuário */}
                      <Skeleton className="h-5 w-5 rounded-full" />

                      {/* Data */}
                      <Skeleton className="h-3 w-16" />

                      {/* Prioridade */}
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Preparar as tarefas para cada coluna


  const columnTasks = columnOrder.reduce((acc: Record<string, Task[]>, columnId: string) => {
    const column = columns[columnId];
    if (!column) return acc;

    acc[columnId] = column.taskIds
      .map(taskId => tasks[taskId])
      .filter(Boolean);



    return acc;
  }, {} as Record<string, Task[]>);

  // Encontrar a tarefa ativa
  const activeTask = activeId ? tasks[activeId] : null;



  return (
    <div className="h-full w-full">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}



      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        autoScroll={true}
      >
        <div className="flex gap-4 h-full w-full overflow-x-auto pb-4">
          {columnOrder.map(columnId => {
            const column = columns[columnId];

            // Se a coluna não existir, criar uma coluna vazia com o ID e título corretos
            if (!column) {

              let title = columnId;

              // Definir títulos para colunas de data
              if (columnId === 'overdue') title = 'Atrasadas';
              else if (columnId === 'today') title = 'Hoje';
              else if (columnId === 'tomorrow') title = 'Amanhã';
              else if (columnId === 'future') title = 'Futuras';

              // Definir títulos para colunas de status
              else if (columnId === 'backlog') title = 'Pendente';
              else if (columnId === 'todo') title = 'A Fazer';
              else if (columnId === 'inProgress') title = 'Em Andamento';
              else if (columnId === 'review') title = 'Em Revisão';
              else if (columnId === 'done') title = 'Concluído';

              return (
                <Column
                  key={columnId}
                  id={columnId}
                  column={{ id: columnId, title, taskIds: [] }}
                  tasks={[]}
                  onAddTask={(columnId) => {
                    setSelectedColumnId(columnId);
                    setIsDialogOpen(true);
                  }}
                  onTaskClick={handleTaskClick}
                  onTaskStatusChange={handleTaskStatusChange}
                  timerRunningTaskId={timerRunningTaskId}
                  setTimerRunningTaskId={setTimerRunningTaskId}
                  onTimerUpdate={handleTimerUpdate}
                />
              );
            }

            return (
              <Column
                key={column.id}
                id={column.id}
                column={column}
                tasks={columnTasks[columnId] || []}
                onAddTask={(columnId) => {
                  setSelectedColumnId(columnId);
                  setIsDialogOpen(true);
                }}
                onTaskClick={handleTaskClick}
                onTaskStatusChange={handleTaskStatusChange}
                timerRunningTaskId={timerRunningTaskId}
                setTimerRunningTaskId={setTimerRunningTaskId}
                onTimerUpdate={handleTimerUpdate}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-[280px] opacity-80 shadow-lg">
              <TaskCard
                task={activeTask}
                onClick={() => {}}
                onTaskStatusChange={handleTaskStatusChange}
                timerRunningTaskId={timerRunningTaskId}
                setTimerRunningTaskId={setTimerRunningTaskId}
                onTimerUpdate={handleTimerUpdate}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de detalhes da tarefa */}
      <TaskDetailsModal
        isOpen={isTaskModalOpen}
        onClose={handleTaskModalClose}
        taskId={selectedTaskId}
        onTaskUpdated={handleTaskUpdated}
        timerRunningTaskId={timerRunningTaskId}
        currentTimerValues={currentTimerValues}
        setCurrentTimerValues={setCurrentTimerValues}
        setTimerRunningTaskId={setTimerRunningTaskId}
      />

      {/* Diálogo para adicionar tarefa */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
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
              defaultStatus={selectedColumnId ? columnToStatusMap[selectedColumnId] : undefined}
              projectUsers={propTeams?.flatMap(team => {
                // Garantir que estamos obtendo usuários válidos das equipes
                if (!team.users) return [];

                // Filtrar usuários duplicados por ID
                const uniqueUsers = new Map();

                team.users.forEach(user => {
                  // Se o usuário for apenas um ID, criar um objeto básico
                  if (typeof user === 'number') {
                    uniqueUsers.set(user, { id: user, name: `Usuário ${user}` });
                  } else if (user && user.id) {
                    uniqueUsers.set(user.id, user);
                  }
                });

                return Array.from(uniqueUsers.values());
              }) || []}
              projectTeams={propTeams || []}
            />
          </div>

          {/* Botões de ação fora do formulário */}
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
                // Encontrar o botão de submit do formulário pelo ID e clicar nele
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
  );
});