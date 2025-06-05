import React, { useState, useEffect, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
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
import { taskService, Task as ApiTask, TaskStatus } from '@/lib/api';
import { UpdateTaskRequest } from '@/lib/api/tasks';
import TaskDetailsModal from "@/components/tasks/TaskDetailsModal";
import useProcessedKanbanData from '@/hooks/useProcessedKanbanData';
import {
  KanbanTask, // Alterado de Task para KanbanTask
  ViewMode,
  BoardMode,
  FiltersObject,
  ProcessedKanbanColumns, // Removido alias desnecessário
  TasksMap,
  ProcessedColumnOrder, // Removido alias desnecessário
  ProcessedKanbanColumn,
} from './kanbanTypes';
import { TaskForm } from '@/components/forms/TaskForm';
import { TaskFormRef } from '@/components/forms/TaskForm'; // Importar TaskFormRef
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

// Interface local Column removida pois ProcessedKanbanColumn de kanbanTypes é usada.
// interface Column {
//   id: string;
//   title: string;
//   taskIds: string[];
// }

// Interface para o objeto de colunas
// Esta interface local KanbanColumns será removida/substituída pela do hook.
// interface KanbanColumns {
//   [key: string]: Column;
// }

interface KanbanBoardProps {
  rawTasks: KanbanTask[];
  viewMode: ViewMode;
  boardMode: BoardMode;
  filters: FiltersObject;
  projectId?: string; // projectId agora é string e opcional, conforme kanbanTypes
  project?: any; // Manter por enquanto, para compatibilidade
  // onTasksUpdated?: () => Promise<void>; // REMOVA esta linha

  // ADICIONE as seguintes props:
  onTaskStatusChange?: (task: KanbanTask, newStatus: TaskStatus, newOrder?: number) => Promise<void>;
  onTasksUpdated?: () => Promise<void>;
  // As props abaixo serão removidas pois seus valores virão através do objeto `filters`
  // ou são controladas pelo componente pai que fornecerá viewMode, boardMode e filters.
  // teams?: any[];
  // selectedTeamId?: number | null;
  // onTeamChange?: (teamId: number | null) => void;
  // selectedUserId?: number | null;
  // onUserChange?: (userId: number | null) => void;
  // onViewModeChange?: (mode: 'status' | 'date') => void;
  // priorityFilter?: string | null;
  // forceUserFilter?: boolean;
  // onTasksFiltered?: (tasks: KanbanTask[]) => void; // Ajustado para KanbanTask
  // mode: 'project-view' | 'tasks-view'; // boardMode substitui 'mode'
  // showCompleted?: boolean;
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
  task: KanbanTask, // Alterado para KanbanTask
  onClick: () => void,
  onTaskStatusChange?: (taskId: number, newStatus: TaskStatus) => void,
  timerRunningTaskId: string | null,
  setTimerRunningTaskId: (id: string | null) => void,
  onTimerUpdate?: (seconds: number) => void // onTimerUpdate em TaskCard espera (seconds: number)
}) => {
  const formatDate = (dateString?: string) => { // dateString pode ser undefined
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
  onTimerUpdate // Esta prop espera (taskId: string, seconds: number) de Column, mas TaskCard passa (seconds: number)
}: {
  id: string,
  task: KanbanTask, // Alterado para KanbanTask
  onClick: () => void,
  onTaskStatusChange?: (taskId: number, newStatus: TaskStatus) => void,
  timerRunningTaskId: string | null,
  setTimerRunningTaskId: (id: string | null) => void,
  onTimerUpdate?: (seconds: number) => void // Mantido como (seconds: number) para corresponder ao TaskCard
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

  // Efeito para observar quando o mouse está sobre a coluna (pode ser usado para feedback visual)
  React.useEffect(() => {
    // console.log(`Mouse over column: ${id}, isOver: ${isOver}`);
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
  id, // id da coluna
  timerRunningTaskId,
  setTimerRunningTaskId,
  onTimerUpdate,
  boardMode // Adicionar boardMode como prop
}: {
  column: ProcessedKanbanColumn, // Usar ProcessedKanbanColumn
  tasks: KanbanTask[], // Usar KanbanTask
  onAddTask: (columnId: string) => void,
  onTaskClick: (task: KanbanTask) => void, // Passar a task inteira
  onTaskStatusChange?: (taskId: number, newStatus: TaskStatus) => void,
  id: string,
  timerRunningTaskId: string | null,
  setTimerRunningTaskId: (id: string | null) => void,
  onTimerUpdate?: (taskId: string, seconds: number) => void, // Modificado para incluir taskId
  boardMode: BoardMode; // Adicionado tipo para boardMode
}) => {
  // Hook de permissões
  const permissions = usePermissions();

  // Determinar se o botão de adicionar tarefa deve ser exibido
  const showAddTaskButton = !(permissions.isMember && (boardMode === 'tasks-view' || boardMode === 'project-view'));


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
            {showAddTaskButton && (
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
              onClick={() => onTaskClick(task)}
              onTaskStatusChange={onTaskStatusChange}
              timerRunningTaskId={timerRunningTaskId}
              setTimerRunningTaskId={setTimerRunningTaskId}
              // onTimerUpdate em SortableTaskCard espera (seconds: number)
              // onTimerUpdate em Column espera (taskId: string, seconds: number)
              // handleTimerUpdate no KanbanBoard espera (taskId: string, seconds: number)
              // A chamada de onTimerUpdate de Column para SortableTaskCard precisa ser ajustada
              // ou a prop onTimerUpdate em SortableTaskCard e TaskCard precisa ser (taskId: string, seconds: number)
              // Por ora, vamos manter a chamada como está e ajustar a prop em Column se necessário.
              onTimerUpdate={(seconds) => onTimerUpdate && onTimerUpdate(String(task.id), seconds)}
            />
          ))}
        </SortableContext>
      </DroppableColumn>
    </div>
  );
};

export const KanbanBoard = React.forwardRef<unknown, KanbanBoardProps>((props, ref) => {
  const {
    rawTasks,
    viewMode,
    boardMode,
    filters,
    projectId,
    // project, // project prop pode não ser mais necessária se rawTasks e filters cobrem tudo
    // onTasksUpdated, // Removido
    onTaskStatusChange, // ADICIONE
    onTasksUpdated // ADICIONE (Renomeado de onGenericTaskUpdate)
  } = props;

  // Consumir o hook useProcessedKanbanData
  const {
    columns: processedColumns, // Renomear para evitar conflito com a 'Column' local
    tasksMap: processedTasksMap, // Renomear para evitar conflito
    columnOrder: processedColumnOrder,
    isLoading: processedDataIsLoading, // Estado de loading do hook
    error: processedDataError, // Estado de erro do hook
  } = useProcessedKanbanData({
    rawTasks,
    viewMode,
    boardMode,
    filters,
    projectId: projectId !== undefined ? String(projectId) : undefined,
  });

  // Hooks de autenticação e permissões
  const { user } = useAuth();
  const permissions = usePermissions();

  // Estado para o item ativo durante o drag
  const [activeId, setActiveId] = useState<string | null>(null);
  // const [activeTaskState, setActiveTaskState] = useState<KanbanTask | null>(null); // activeTask será derivado de processedTasksMap

  // Estados para o modal de detalhes da tarefa
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<KanbanTask | null>(null);

  // Estado para o diálogo de criação/edição de tarefa
  const [isCreateEditDialogOpen, setIsCreateEditDialogOpen] = useState(false);
  const [currentColumnIdForNewTask, setCurrentColumnIdForNewTask] = useState<string | null>(null);
  const [createTaskFormInstanceId, setCreateTaskFormInstanceId] = useState<string | null>(null); // Novo estado
  const [timerRunningTaskId, setTimerRunningTaskId] = useState<string | null>(null);
  const createTaskFormRef = useRef<TaskFormRef>(null); // Ref para o TaskForm de criação
  const [currentTimerValues, setCurrentTimerValues] = useState<Record<string, number>>({});

  // Log para depuração do estado do modal do KanbanBoard
  console.log(`[KanbanBoard.tsx] Renderizando. isCreateEditDialogOpen: ${isCreateEditDialogOpen}, createTaskFormInstanceId: ${createTaskFormInstanceId}`);

  // Função para fechar e resetar o diálogo de criação de tarefa do Kanban
  const handleCloseKanbanDialog = () => {
    setIsCreateEditDialogOpen(false);
    setCurrentColumnIdForNewTask(null); 
    // Resetar o instanceId pode ajudar a garantir que o TaskForm seja remontado se necessário,
    // mas pode ser opcional dependendo do comportamento desejado.
    // Por ora, vamos manter o reset para maior clareza de estado.
    setCreateTaskFormInstanceId(null); 
  };

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

  // As funções fetchTasks, filterTasks, distributeTasksToColumns e processTasks foram removidas.
  // A lógica de busca, filtragem e geração de colunas agora é tratada pelos componentes pais
  // e pelo hook useProcessedKanbanData.

  // Não é mais necessário expor fetchTasks via ref, pois o KanbanBoard não busca mais seus dados.
  useImperativeHandle(ref, () => ({
    // Se houver outros métodos que o pai precise chamar, eles podem ser expostos aqui.
    // Por enquanto, não há necessidade de fetchTasks.
  }));

  // O useEffect que chamava fetchTasks na mudança de viewMode foi removido.
  // O hook useProcessedKanbanData já reage a mudanças em viewMode.

  // Efeito para atualizar o valor atual do timer quando ele está em execução
  useEffect(() => {
    if (!timerRunningTaskId) return;

    const task = processedTasksMap[timerRunningTaskId];
    if (task) {
      // Sempre define/reseta o valor do timer para a tarefa ativa ao iniciar/trocar o timer.
      // Isso garante que começamos a contar do valor correto da tarefa (vindo da API via processedTasksMap).
      setCurrentTimerValues(prev => ({
        ...prev,
        [timerRunningTaskId]: task.timer || 0,
      }));
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
      // A lógica de salvar o timer foi movida para handleDragEnd e handleTaskStatusChange
      // para garantir que o valor mais recente de currentTimerValues seja usado.
    };
  }, [timerRunningTaskId, processedTasksMap]); // Manter processedTasksMap como dependência

  // Função chamada quando o usuário começa a arrastar um item
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(String(active.id));
  };

  // Função para encontrar a coluna que contém um determinado ID de tarefa
  // Agora usa processedColumns do hook.
  const findColumnOfTask = useCallback((taskId: string): string | null => {
    for (const [columnId, columnData] of Object.entries(processedColumns)) {
      if (columnData.taskIds.includes(taskId)) {
        return columnId;
      }
    }
    return null;
  }, [processedColumns]);

  // Função chamada quando o usuário termina de arrastar um item
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    console.log('[KanbanBoard.tsx] handleDragEnd START', { activeId: active.id, overId: over?.id });

    if (!over) {
      setActiveId(null);
      console.log('[KanbanBoard.tsx] handleDragEnd: No "over" target. Exiting.');
      return;
    }

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Não resetar activeId aqui ainda, pois precisamos dele para a lógica do timer
    // setActiveId(null); // Movido para o final do bloco try/catch/finally

    if (activeIdStr === overIdStr && !processedColumns[overIdStr]) { // Se soltar sobre si mesmo, mas não numa coluna
      // Se soltou sobre si mesmo (mesma tarefa), não faz nada a menos que seja para reordenar na mesma coluna.
      // A lógica de reordenação já trata isso.
      // Se overIdStr não é uma coluna, e activeIdStr === overIdStr, significa que soltou sobre si mesmo.
      // Se for uma coluna, a lógica abaixo de encontrar destinationColumnId tratará.
      // Se não for uma coluna e for a mesma tarefa, não há mudança de coluna ou ordem real.
       setActiveId(null);
       console.log('[KanbanBoard.tsx] handleDragEnd: Dropped on self (not a column). Exiting.');
      return;
    }

    const sourceColumnId = findColumnOfTask(activeIdStr);
    console.log('[KanbanBoard.tsx] handleDragEnd: Source Column ID:', sourceColumnId);
    if (!sourceColumnId) {
      setActiveId(null);
      console.log('[KanbanBoard.tsx] handleDragEnd: Source column not found. Exiting.');
      return;
    }

    let destinationColumnId = overIdStr;
    // Se overIdStr não é uma chave em processedColumns, significa que 'over' é uma tarefa,
    // então precisamos encontrar a coluna dessa tarefa.
    if (!(overIdStr in processedColumns)) {
      const columnContainingOverTask = findColumnOfTask(overIdStr);
      console.log('[KanbanBoard.tsx] handleDragEnd: "over" is a task. Column of "over" task:', columnContainingOverTask);
      if (columnContainingOverTask) {
        destinationColumnId = columnContainingOverTask;
      } else {
        // Se não encontrar a coluna da tarefa 'over', não faz nada ou reverte para a coluna original
        setActiveId(null);
        console.log('[KanbanBoard.tsx] handleDragEnd: Destination column for "over" task not found. Exiting.');
        return;
      }
    }
    console.log('[KanbanBoard.tsx] handleDragEnd: Destination Column ID:', destinationColumnId);
    
    const taskToMove = processedTasksMap[activeIdStr];
    if (!taskToMove) {
      toast.error('Tarefa não encontrada para mover.');
      setActiveId(null);
      console.log('[KanbanBoard.tsx] handleDragEnd: Task to move not found in processedTasksMap. Exiting.');
      return;
    }
    console.log('[KanbanBoard.tsx] handleDragEnd - Task to move (ID, Status, Order):', { id: taskToMove.id, status: taskToMove.status, order: taskToMove.order });

    // Lógica de atualização da API FOI MOVIDA PARA ProjectView
    try {
      let newApiStatus: TaskStatus | undefined = undefined;
      let newOrderCalculated: number | undefined = undefined;
      // Variável para guardar o status que será enviado para a prop.
      // Inicialmente, é o status atual da tarefa.
      let statusForPropCallback: TaskStatus = taskToMove.status;
      let updateData: Partial<UpdateTaskRequest> = {};


      if (sourceColumnId !== destinationColumnId) { // Movendo para outra coluna
        if (viewMode === 'status') {
          const potentialNewStatus = columnToStatusMap[destinationColumnId];
          console.log('[KanbanBoard.tsx] handleDragEnd: Moving to different column (status mode). Potential new status:', potentialNewStatus, 'Current status:', taskToMove.status);
          if (potentialNewStatus && potentialNewStatus !== taskToMove.status) {
            newApiStatus = potentialNewStatus; // Este é o novo status para a API
            statusForPropCallback = newApiStatus; // Atualiza o status para o callback
          } else if (!potentialNewStatus) {
            console.warn(`Status não mapeado para a coluna de destino: ${destinationColumnId}`);
          }
        } else if (viewMode === 'date') {
          console.log('[KanbanBoard.tsx] handleDragEnd: Moving to different column (date mode). Destination column:', destinationColumnId);
          let newDueDate: string | undefined = undefined;
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          const formattedToday = `${yyyy}-${mm}-${dd}`;

          if (destinationColumnId === 'today') {
            newDueDate = formattedToday;
          } else if (destinationColumnId === 'tomorrow') {
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const टुमॉरोYYYY = tomorrow.getFullYear();
            const टुमॉरोMM = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const टुमॉरोDD = String(tomorrow.getDate()).padStart(2, '0');
            newDueDate = `${टुमॉरोYYYY}-${टुमॉरोMM}-${टुमॉरोDD}`;
          } else if (destinationColumnId === 'overdue') {
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const येस्टरडेYYYY = yesterday.getFullYear();
            const येस्टरडेMM = String(yesterday.getMonth() + 1).padStart(2, '0');
            const येस्टरडेDD = String(yesterday.getDate()).padStart(2, '0');
            newDueDate = `${येस्टरडेYYYY}-${येस्टरडेMM}-${येस्टरडेDD}`;
          } else if (destinationColumnId === 'future') {
            const tenDaysFromNow = new Date(today);
            tenDaysFromNow.setDate(today.getDate() + 10); // Alterado de 7 para 10
            const फ्यूचरYYYY = tenDaysFromNow.getFullYear();
            const फ्यूचरMM = String(tenDaysFromNow.getMonth() + 1).padStart(2, '0');
            const फ्यूचरDD = String(tenDaysFromNow.getDate()).padStart(2, '0');
            newDueDate = `${फ्यूचरYYYY}-${फ्यूचरMM}-${फ्यूचरDD}`;
          }

          if (newDueDate) {
            console.log('[KanbanBoard.tsx] handleDragEnd: New Due Date calculated:', newDueDate);
            updateData.due_date = newDueDate;
            // Não alteramos o status da tarefa ao mover entre colunas de data
            // Apenas a data de vencimento é atualizada.
            // O status visual (ex: cor do card) pode ser alterado pela UI com base na nova data.
          } else {
            console.log('[KanbanBoard.tsx] handleDragEnd: No new due date calculated for column:', destinationColumnId);
          }
        }
      }

      // Lógica refatorada para calcular a nova ordem (permanece a mesma)
      const tasksInDestColumnFiltered = (processedColumns[destinationColumnId]?.taskIds || [])
        .filter(id => id !== activeIdStr)
        .map(id => processedTasksMap[id])
        .filter(Boolean) as KanbanTask[];
      
      tasksInDestColumnFiltered.sort((a, b) => (a.order || 0) - (b.order || 0));
      console.log('[KanbanBoard.tsx] handleDragEnd: Tasks in destination column (for order calc):', tasksInDestColumnFiltered.map(t => ({id: t.id, order: t.order})));

      let insertAtIndex = tasksInDestColumnFiltered.length;

      // Se 'over' é uma tarefa (não uma coluna) e não é a tarefa ativa, calcula o índice de inserção
      if (processedTasksMap[overIdStr] && overIdStr !== activeIdStr) {
        const overTaskActualIndex = tasksInDestColumnFiltered.findIndex(t => String(t.id) === overIdStr);
        console.log('[KanbanBoard.tsx] handleDragEnd: "over" is a task. Index of "over" task in dest column:', overTaskActualIndex);
        if (overTaskActualIndex !== -1) {
          // Se a tarefa ativa está sendo arrastada para baixo sobre outra tarefa,
          // o índice de inserção deve ser após a tarefa 'over'.
          // Se está sendo arrastada para cima, o índice é o da tarefa 'over'.
          // A lógica atual de dnd-kit geralmente coloca antes se não houver distinção.
          // Para ser mais preciso, pode-se verificar a posição do cursor em relação ao item 'over'.
          // Por simplicidade, a lógica atual de insertAtIndex é mantida.
          insertAtIndex = overTaskActualIndex;
        }
      } else if (processedColumns[overIdStr]) { // Se 'over' é uma coluna, insere no final
        console.log('[KanbanBoard.tsx] handleDragEnd: "over" is a column. Inserting at end.');
        insertAtIndex = tasksInDestColumnFiltered.length;
      }
      console.log('[KanbanBoard.tsx] handleDragEnd: Calculated insertAtIndex:', insertAtIndex);
      
      if (insertAtIndex === 0) {
        if (tasksInDestColumnFiltered.length > 0) {
          newOrderCalculated = (tasksInDestColumnFiltered[0].order || 1) / 2;
          console.log('[KanbanBoard.tsx] handleDragEnd: New order (insert at 0):', newOrderCalculated, 'based on first task order:', tasksInDestColumnFiltered[0].order);
        } else {
          newOrderCalculated = 10;
          console.log('[KanbanBoard.tsx] handleDragEnd: New order (insert at 0, empty column):', newOrderCalculated);
        }
      } else if (insertAtIndex >= tasksInDestColumnFiltered.length) {
        if (tasksInDestColumnFiltered.length > 0) {
          newOrderCalculated = (tasksInDestColumnFiltered[tasksInDestColumnFiltered.length - 1].order || 0) + 10;
          console.log('[KanbanBoard.tsx] handleDragEnd: New order (insert at end):', newOrderCalculated, 'based on last task order:', tasksInDestColumnFiltered[tasksInDestColumnFiltered.length - 1].order);
        } else {
          newOrderCalculated = 10; // Deveria ser coberto pelo caso de insertAtIndex === 0 e coluna vazia
          console.log('[KanbanBoard.tsx] handleDragEnd: New order (insert at end, empty column - fallback):', newOrderCalculated);
        }
      } else {
        const prevTaskOrder = tasksInDestColumnFiltered[insertAtIndex - 1].order || 0;
        const nextTaskOrder = tasksInDestColumnFiltered[insertAtIndex].order || 0;
        newOrderCalculated = (prevTaskOrder + nextTaskOrder) / 2;
        console.log('[KanbanBoard.tsx] handleDragEnd: New order (insert between):', newOrderCalculated, 'based on prev/next orders:', prevTaskOrder, nextTaskOrder);
      }
      
      const roundedNewOrder = newOrderCalculated !== undefined ? parseFloat(newOrderCalculated.toFixed(5)) : undefined;
      console.log('[KanbanBoard.tsx] handleDragEnd: Rounded new order:', roundedNewOrder);

      // Verifica se houve mudança de status ou de ordem para chamar o callback
      const statusChanged = newApiStatus !== undefined && newApiStatus !== taskToMove.status;
      const orderChanged = roundedNewOrder !== undefined && roundedNewOrder !== taskToMove.order;
      const dueDateChanged = updateData.due_date !== undefined && updateData.due_date !== taskToMove.due_date;

      console.log('[KanbanBoard.tsx] handleDragEnd: Status changed?', statusChanged, 'Order changed?', orderChanged, 'Due date changed?', dueDateChanged);

        const taskToMoveIdStr = String(taskToMove.id);
        const finalDestStatus = newApiStatus || taskToMove.status;
        console.log('[KanbanBoard.tsx] handleDragEnd: Final destination status for timer logic:', finalDestStatus);

        // Lógica de atualização do timer (mantida como estava, mas agora considera o updateData para dueDate)
        if (timerRunningTaskId === taskToMoveIdStr && finalDestStatus !== 'em_andamento') {
          console.log('[KanbanBoard.tsx] handleDragEnd: Timer - Stopping timer for moved task.', { taskToMoveIdStr, currentTimerValue: currentTimerValues[taskToMoveIdStr] });
          const currentTimeToSave = currentTimerValues[taskToMoveIdStr];
          setTimerRunningTaskId(null);
          if (currentTimeToSave !== undefined) {
            updateData.timer = currentTimeToSave; // Adiciona ao updateData se ainda não estiver lá
            // Não chama handleTimerUpdate aqui diretamente, pois a atualização principal abaixo cuidará disso.
          }
        }

        // Se houve mudança de status, ordem OU data de vencimento, precisamos atualizar a tarefa.
        if (statusChanged || orderChanged || dueDateChanged) {
          if (viewMode === 'status' && onTaskStatusChange && (statusChanged || orderChanged)) {
            console.log('[KanbanBoard.tsx] handleDragEnd: Calling onTaskStatusChange for status/order update.', { taskId: taskToMove.id, finalDestStatus, roundedNewOrder });
            // onTaskStatusChange é responsável por chamar taskService.updateTask com status e ordem.
            // Se houver dueDate em updateData, ele será ignorado por esta chamada.
            await onTaskStatusChange(taskToMove, finalDestStatus, roundedNewOrder);
            toast.success(`Tarefa "${taskToMove.title}" atualizada (status/ordem).`);
          } else if (viewMode === 'date' && dueDateChanged) {
            // Se estamos no modo de data e a data de vencimento mudou,
            // precisamos chamar taskService.updateTask diretamente com updateData.
            // Se a ordem também mudou, precisamos incluir isso.
            if (orderChanged && roundedNewOrder !== undefined) {
              updateData.order = roundedNewOrder;
            }
            if (taskToMove && Object.keys(updateData).length > 0) {
              console.log('[KanbanBoard.tsx] handleDragEnd: Calling taskService.updateTask for due_date/order update.', { taskId: Number(taskToMove.id), updateData });
              try {
                const updateResult = await taskService.updateTask(Number(taskToMove.id), updateData);
                console.log('[KanbanBoard.tsx] handleDragEnd: Task update result for due_date:', updateResult);
                toast.success(`Data de vencimento da tarefa "${taskToMove.title}" atualizada.`);
                if (typeof onTasksUpdated === 'function') {
                  await onTasksUpdated();
                }
              } catch (error) {
                console.error('Erro ao atualizar data de vencimento da tarefa:', error);
                toast.error('Erro ao atualizar data de vencimento da tarefa.');
                 if (typeof onTasksUpdated === 'function') { // Recarregar mesmo em erro para consistência
                  await onTasksUpdated();
                }
              }
            }
          } else if (orderChanged && !statusChanged && !dueDateChanged) {
            // Se apenas a ordem mudou (ex: dentro da mesma coluna de status ou data)
            // e não há onTaskStatusChange (ou não é modo status), ou não há mudança de data.
            // Esta situação pode precisar de um tratamento mais específico se onTaskStatusChange não for chamado
            // e a ordem precise ser salva.
            // No entanto, a lógica de onTaskStatusChange já cobre a mudança de ordem.
            // E a lógica de dueDateChanged acima também cobre mudança de ordem.
            // Se for modo status e só ordem mudou, onTaskStatusChange será chamado.
            // Se for modo data e só ordem mudou, e não dueDateChanged, precisamos de uma chamada.
            if (viewMode === 'date' && taskToMove && roundedNewOrder !== undefined) {
                 console.log('[KanbanBoard.tsx] handleDragEnd: Only order changed in date view. Calling taskService.updateTask for order update.', { taskId: Number(taskToMove.id), order: roundedNewOrder });
                try {
                    await taskService.updateTask(Number(taskToMove.id), { order: roundedNewOrder });
                    toast.success(`Ordem da tarefa "${taskToMove.title}" atualizada.`);
                    if (typeof onTasksUpdated === 'function') {
                        await onTasksUpdated();
                    }
                } catch (error) {
                    console.error('Erro ao atualizar ordem da tarefa em modo data:', error);
                    toast.error('Erro ao atualizar ordem da tarefa.');
                     if (typeof onTasksUpdated === 'function') {
                        await onTasksUpdated();
                    }
                }
            } else if (viewMode === 'status' && !onTaskStatusChange) {
                // Caso raro: modo status, só ordem mudou, mas não há onTaskStatusChange.
                // Isso implicaria que o KanbanBoard está sendo usado de forma que não pode atualizar status/ordem.
                console.warn('[KanbanBoard.tsx] handleDragEnd: Only order changed in status view, but no onTaskStatusChange handler.');
            }

          } else {
             console.log('[KanbanBoard.tsx] handleDragEnd: No status, order, or due date change significant enough to trigger specific update. Current updateData:', updateData);
             // Se updateData tiver algo (ex: timer), e nenhuma das condições acima foi atendida,
             // ainda podemos precisar fazer uma atualização genérica se, por exemplo, só o timer mudou.
             // Mas o timer já é salvo separadamente em handleTimerUpdate.
             // Se onTaskStatusChange não foi chamado, e não houve mudança de data,
             // e não houve apenas mudança de ordem no modo data, então talvez nada precise ser feito.
             // Ou, se updateData tiver timer, e o timer era a ÚNICA mudança,
             // isso já deveria ter sido tratado pelo handleTimerUpdate.
             // A questão é se o timer precisa ser agrupado com a mudança de data.
             // A lógica atual do timer já salva o timer via handleTimerUpdate ANTES desta seção.
             // Se updateData.timer foi definido acima, ele será incluído na chamada de taskService.updateTask
             // se uma das condições de (statusChanged || orderChanged || dueDateChanged) for verdadeira.
          }
        } else {
          console.log('[KanbanBoard.tsx] handleDragEnd: No status, order, or due date change detected. No call to onTaskStatusChange or taskService.updateTask for due_date.');
        }

        // Lógica do timer para iniciar/parar (após atualizações de status/data/ordem)
        if (finalDestStatus === 'em_andamento') {
          console.log('[KanbanBoard.tsx] handleDragEnd: Timer - Task moved to "em_andamento".');
          if (timerRunningTaskId && timerRunningTaskId !== taskToMoveIdStr) {
            console.log('[KanbanBoard.tsx] handleDragEnd: Timer - Another timer was running. Stopping it.', { oldRunningTaskId: timerRunningTaskId, value: currentTimerValues[timerRunningTaskId] });
            const otherTaskTimerValue = currentTimerValues[timerRunningTaskId];
            const oldRunningTaskId = timerRunningTaskId;
            if (otherTaskTimerValue !== undefined) {
              // Salva o timer da tarefa anterior, mas não aguarda aqui para não bloquear a UI.
              // handleTimerUpdate fará o onTasksUpdated.
              handleTimerUpdate(oldRunningTaskId, otherTaskTimerValue);
            }
          }
          console.log('[KanbanBoard.tsx] handleDragEnd: Timer - Setting timerRunningTaskId to:', taskToMoveIdStr);
          setTimerRunningTaskId(taskToMoveIdStr); // Inicia o timer para a tarefa movida
        }
        // Se a tarefa foi movida PARA FORA de 'em_andamento', o timer já foi parado e salvo na seção anterior (timerRunningTaskId === taskToMoveIdStr && finalDestStatus !== 'em_andamento')

    } catch (err) {
      console.error("Erro ao processar drag-and-drop no KanbanBoard:", err);
      toast.error('Erro ao mover tarefa.');
    } finally {
      setActiveId(null);
      console.log('[KanbanBoard.tsx] handleDragEnd FINALLY - activeId set to null.');
    }
  };

  // Função para encontrar o ID da tarefa a partir do objeto over
  // Esta função pode não ser mais necessária se a lógica de handleDragEnd for simplificada
  // para usar diretamente os IDs de active e over.

  const handleTaskClick = (task: KanbanTask) => {
    setSelectedTaskForModal(task);
    setIsTaskDetailsModalOpen(true);
  };

  const handleTaskModalClose = () => {
    setIsTaskDetailsModalOpen(false);
    setSelectedTaskForModal(null);
  };

  const handleTaskUpdated = async () => {
    if (onTasksUpdated) { // Alterado de onTasksUpdated
      await onTasksUpdated(); // Alterado de onTasksUpdated
    }
    // O hook useProcessedKanbanData reagirá à mudança em rawTasks e reprocessará os dados.
    // A lógica de timer e atualização de estado local que estava aqui foi simplificada
    // pois a fonte da verdade (rawTasks) será atualizada pelo pai.
  };

  // Função para atualizar o timer de uma tarefa
  const handleTimerUpdate = async (taskIdStr: string, seconds: number) => {
    if (!taskIdStr) return;
    const timerValue = Number(seconds);
    if (isNaN(timerValue)) {
      toast.error('Erro ao processar o tempo.');
      return;
    }

    setCurrentTimerValues(prev => ({ ...prev, [taskIdStr]: timerValue }));

    try {
      await taskService.updateTask(Number(taskIdStr), { timer: timerValue });
      toast.success('Tempo da tarefa atualizado.');
      if (onTasksUpdated) {
        await onTasksUpdated();
      }
    } catch (err) {
      toast.error('Erro ao atualizar timer da tarefa.');
      // Recarregar para buscar o estado consistente da API mesmo em caso de erro na atualização do timer
      if (onTasksUpdated) {
        await onTasksUpdated();
      }
    }
  };

  // Função para lidar com a mudança de status de uma tarefa (ex: pelo temporizador)
  const handleTaskStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    const taskIdStr = String(taskId);
    const currentTask = processedTasksMap[taskIdStr]; 

    if (!currentTask) return;

    const previousTimerRunningId = timerRunningTaskId; // Capturar o ID do timer antes de qualquer mudança

    // Notificar o pai sobre a mudança de status para que ele atualize a API e rawTasks
    // Somente se o status realmente mudou.
    if (currentTask.status !== newStatus) {
      if (onTaskStatusChange) { // Prop do KanbanBoard (Tasks.handleKanbanTaskStatusChange)
        await onTaskStatusChange(currentTask, newStatus); // Isso vai atualizar rawTasks, e então processedTasksMap
      }
    }

    // Lógica do timer local ao KanbanBoard, baseada no newStatus
    // Esta lógica é acionada pela interação do usuário com o TaskTimer (via TaskCard)
    if (newStatus === 'em_andamento') {
      if (previousTimerRunningId && previousTimerRunningId !== taskIdStr) {
        // Outra tarefa estava com o timer rodando, parar e salvar o timer dela.
        const previousTimerValue = currentTimerValues[previousTimerRunningId];
        if (previousTimerValue !== undefined) {
          await handleTimerUpdate(previousTimerRunningId, previousTimerValue);
        }
      }
      setTimerRunningTaskId(taskIdStr);
      // O useEffect de timerRunningTaskId pegará o valor de task.timer do processedTasksMap atualizado
      // para inicializar currentTimerValues[taskIdStr] se necessário.
    } else if (previousTimerRunningId === taskIdStr && newStatus !== 'em_andamento') {
      // O timer desta tarefa (taskIdStr) estava rodando (previousTimerRunningId === taskIdStr)
      // e o status mudou para algo que não é 'em_andamento'
      // (ou o usuário pausou o timer manualmente, o que também pode mudar o status para a_fazer)
      setTimerRunningTaskId(null); // Para o timer
      const currentTime = currentTimerValues[taskIdStr]; // Pega o valor mais recente de currentTimerValues
      if (currentTime !== undefined) {
        await handleTimerUpdate(taskIdStr, currentTime); // Salva
      }
    }
    // Se o status não mudou (ex: tarefa já 'em_andamento' e usuário clica play),
    // o TaskTimer em si já lida com onStatusChange("Em Andamento").
    // Se newStatus é 'em_andamento' e timerRunningTaskId já é taskIdStr, nada precisa ser feito aqui.
    // Se newStatus é 'em_andamento' e timerRunningTaskId é null ou diferente, a lógica acima cobre.
  };

  const handleTaskFormSuccess = async (taskData: any) => { // Aceitar taskData
    console.log('[KanbanBoard.tsx] handleTaskFormSuccess INÍCIO. taskData:', taskData);
    try {
      console.log('[KanbanBoard.tsx] handleTaskFormSuccess: ANTES de chamar taskService.createTask.');
      // Adicionar a lógica para criar a tarefa na API
      // Certifique-se de que taskData está no formato esperado por createTask
      // (pode ser necessário ajustar os nomes dos campos se TaskForm envia algo diferente do que createTask espera)
      const newTask = await taskService.createTask(taskData);
      console.log('[KanbanBoard.tsx] handleTaskFormSuccess: DEPOIS de chamar taskService.createTask. Nova tarefa:', newTask);

      handleCloseKanbanDialog(); // Usa a função centralizada para fechar e resetar
      toast.success('Tarefa criada com sucesso!');
      if (onTasksUpdated) {
        await onTasksUpdated();
      }
    } catch (error) {
      console.error('[KanbanBoard.tsx] ERRO CAPTURADO em handleTaskFormSuccess:', error);
      toast.error('Erro ao criar tarefa no Kanban. Verifique os dados e tente novamente.');
      // Não fechar o diálogo em caso de erro para o usuário poder corrigir
    }
  };

  // A ordem das colunas (processedColumnOrder) vem do hook useProcessedKanbanData
  // As colunas (processedColumns) e o mapa de tarefas (processedTasksMap) também vêm do hook.

  if (processedDataIsLoading) {
    return (
      <div className="h-full">
        <div className="flex gap-4 h-full overflow-x-auto pb-4">
          {(processedColumnOrder.length > 0 ? processedColumnOrder : statusColumnOrder).map(columnId => ( // Fallback para statusColumnOrder se processedColumnOrder estiver vazio durante o loading inicial
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
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-3 w-16" />
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
  
  const activeTask = activeId ? processedTasksMap[activeId] : null;

  return (
    <div className="h-full w-full">
      {processedDataError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{processedDataError}</AlertDescription>
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
          {processedColumnOrder.map(columnId => {
            const columnData = processedColumns[columnId];
            if (!columnData) {
              // Isso não deve acontecer se useProcessedKanbanData estiver funcionando corretamente
              // Mas como fallback, podemos renderizar uma coluna vazia ou um placeholder.
              console.warn(`Dados da coluna ${columnId} não encontrados.`);
              return (
                <div key={columnId} className="kanban-column min-w-[280px] max-w-[280px] bg-card flex flex-col border rounded-lg overflow-hidden p-3">
                  <h3 className="font-medium">{columnId} (Erro)</h3>
                </div>
              );
            }

            const tasksInColumn = columnData.taskIds.map(taskId => processedTasksMap[taskId]).filter(Boolean) as KanbanTask[];

            return (
              <Column
                key={columnData.id}
                id={columnData.id} // id da coluna
                column={columnData}
                tasks={tasksInColumn}
                boardMode={boardMode} // Passar boardMode para Column
                onAddTask={(colId) => {
                  setCurrentColumnIdForNewTask(colId);
                  setCreateTaskFormInstanceId(`kanban-create-task-${Date.now()}`); // Gerar ID único
                  setIsCreateEditDialogOpen(true);
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
                onClick={() => {}} // DragOverlay não deve ser clicável
                onTaskStatusChange={handleTaskStatusChange} // Passar para consistência, mas não será usado no overlay
                timerRunningTaskId={timerRunningTaskId} // Passar para consistência
                setTimerRunningTaskId={setTimerRunningTaskId} // Passar para consistência
                onTimerUpdate={(seconds) => activeTask && handleTimerUpdate(String(activeTask.id), seconds)}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedTaskForModal && typeof selectedTaskForModal.id === 'number' && ( // Garante que id é number
        <TaskDetailsModal
          isOpen={isTaskDetailsModalOpen}
          onClose={handleTaskModalClose}
          taskId={selectedTaskForModal.id}
          onTaskUpdated={handleTaskUpdated}
          timerRunningTaskId={timerRunningTaskId}
          currentTimerValues={currentTimerValues}
          setCurrentTimerValues={setCurrentTimerValues}
          setTimerRunningTaskId={setTimerRunningTaskId}
        />
      )}

      <Dialog 
        key={createTaskFormInstanceId || 'kanban-create-dialog'} 
        open={isCreateEditDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            handleCloseKanbanDialog();
          } else {
            // Se estiver abrindo, o KanbanBoard já define o instanceId e currentColumnId
            // onde o botão de "+" é clicado.
            setIsCreateEditDialogOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Tarefa</DialogTitle>
            <DialogDescription>
              Preencha os detalhes da tarefa. Clique em salvar quando terminar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <TaskForm
              key={createTaskFormInstanceId || 'kanban-create-form'}
              ref={createTaskFormRef}
              onSuccess={handleTaskFormSuccess}
              defaultProjectId={projectId ? Number(projectId) : undefined}
              defaultStatus={currentColumnIdForNewTask ? columnToStatusMap[currentColumnIdForNewTask] : undefined}
              formInstanceId={createTaskFormInstanceId || undefined}
            />
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseKanbanDialog} // Usa a função centralizada
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                console.log(`[KanbanBoard.tsx] Botão Salvar do modal clicado. Acionando submit via ref. InstanceId: ${createTaskFormInstanceId}`);
                createTaskFormRef.current?.triggerSubmit();
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
