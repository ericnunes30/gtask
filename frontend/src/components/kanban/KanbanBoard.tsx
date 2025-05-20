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
  onTasksUpdated?: () => Promise<void>; // Manter por enquanto
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
    onTasksUpdated,
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

    // Verificar se já temos um valor inicial para o timer
    if (currentTimerValues[timerRunningTaskId] === undefined) { // Checar por undefined para permitir timer 0
      // Se não temos, usar o valor do timer da tarefa do processedTasksMap
      const task = processedTasksMap[timerRunningTaskId];
      if (task) {
        setCurrentTimerValues(prev => ({
          ...prev,
          [timerRunningTaskId]: task.timer || 0,
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
  }, [timerRunningTaskId, processedTasksMap, currentTimerValues]);

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

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (activeIdStr === overIdStr) {
      setActiveId(null);
      return;
    }

    const sourceColumnId = findColumnOfTask(activeIdStr);
    if (!sourceColumnId) {
      setActiveId(null);
      return;
    }

    let destinationColumnId = overIdStr;
    // Se overIdStr não é uma chave em processedColumns, significa que 'over' é uma tarefa,
    // então precisamos encontrar a coluna dessa tarefa.
    if (!(overIdStr in processedColumns)) {
      const columnContainingOverTask = findColumnOfTask(overIdStr);
      if (columnContainingOverTask) {
        destinationColumnId = columnContainingOverTask;
      } else {
        // Se não encontrar a coluna da tarefa 'over', não faz nada ou reverte para a coluna original
        setActiveId(null);
        return;
      }
    }
    
    const taskToMove = processedTasksMap[activeIdStr];
    if (!taskToMove) {
      toast.error('Tarefa não encontrada para mover.');
      setActiveId(null);
      return;
    }
    console.log('[KanbanBoard.tsx] handleDragEnd - taskToMove:', JSON.parse(JSON.stringify(taskToMove)));

    // Lógica de atualização da API
    try {
      const updateData: UpdateTaskRequest = {};
      let newOrderCalculated: number | undefined = undefined;

      if (sourceColumnId !== destinationColumnId) { // Movendo para outra coluna
        if (viewMode === 'status') {
          const newStatus = columnToStatusMap[destinationColumnId];
          if (newStatus && newStatus !== taskToMove.status) {
            updateData.status = newStatus;
          } else if (!newStatus) {
            console.warn(`Status não mapeado para a coluna de destino: ${destinationColumnId}`);
          }
        } else { // viewMode === 'date'
          const today = new Date(); today.setHours(12,0,0,0);
          const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
          const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1); // Para 'overdue'
          const futureDate = new Date(today); futureDate.setDate(today.getDate() + 3); // Um pouco mais no futuro

          let newDueDateStr: string | undefined = undefined;
          if (destinationColumnId === 'today') newDueDateStr = today.toISOString().split('T')[0];
          else if (destinationColumnId === 'tomorrow') newDueDateStr = tomorrow.toISOString().split('T')[0];
          else if (destinationColumnId === 'overdue') newDueDateStr = yesterday.toISOString().split('T')[0];
          else if (destinationColumnId === 'future') newDueDateStr = futureDate.toISOString().split('T')[0];
          
          if (newDueDateStr && newDueDateStr !== taskToMove.due_date?.split('T')[0]) {
            updateData.dueDate = newDueDateStr;
          }
        }
      }

      // Lógica refatorada para calcular a nova ordem
      const tasksInDestColumnFiltered = (processedColumns[destinationColumnId]?.taskIds || [])
        .filter(id => id !== activeIdStr) // Exclui a tarefa ativa da lista de referência
        .map(id => processedTasksMap[id])
        .filter(Boolean) as KanbanTask[];
      
      tasksInDestColumnFiltered.sort((a, b) => (a.order || 0) - (b.order || 0));

      let insertAtIndex = tasksInDestColumnFiltered.length; // Padrão: inserir no final

      if (processedTasksMap[overIdStr] && overIdStr !== activeIdStr) { // Se 'over' é uma tarefa válida e não a própria tarefa ativa
        // Encontrar o índice de 'overIdStr' na lista ordenada e filtrada da coluna de destino
        const overTaskActualIndex = tasksInDestColumnFiltered.findIndex(t => String(t.id) === overIdStr);
        if (overTaskActualIndex !== -1) {
          insertAtIndex = overTaskActualIndex;
        }
      }
      // Se 'over' é a própria coluna (overIdStr === destinationColumnId), já estamos inserindo no final (insertAtIndex = tasksInDestColumnFiltered.length)

      if (insertAtIndex === 0) { // Inserir no início da coluna de destino
        if (tasksInDestColumnFiltered.length > 0) {
          newOrderCalculated = (tasksInDestColumnFiltered[0].order || 1) / 2;
        } else { // A coluna de destino (sem a tarefa ativa) está vazia
          newOrderCalculated = 10; // Ordem padrão para a primeira tarefa
        }
      } else if (insertAtIndex >= tasksInDestColumnFiltered.length) { // Inserir no final
        if (tasksInDestColumnFiltered.length > 0) {
          newOrderCalculated = (tasksInDestColumnFiltered[tasksInDestColumnFiltered.length - 1].order || 0) + 10;
        } else { // A coluna de destino (sem a tarefa ativa) estava vazia
          newOrderCalculated = 10; // Ordem padrão
        }
      } else { // Inserir entre duas tarefas existentes na coluna de destino
        const prevTaskOrder = tasksInDestColumnFiltered[insertAtIndex - 1].order || 0;
        const nextTaskOrder = tasksInDestColumnFiltered[insertAtIndex].order || 0;
        newOrderCalculated = (prevTaskOrder + nextTaskOrder) / 2;
      }
      
      // Adicionar a ordem ao updateData apenas se ela mudou
      if (newOrderCalculated !== undefined && newOrderCalculated !== taskToMove.order) {
        // Arredondar para evitar problemas de precisão excessiva com floats
        const roundedNewOrder = parseFloat(newOrderCalculated.toFixed(5));
        if (roundedNewOrder !== taskToMove.order) {
             updateData.order = roundedNewOrder;
        }
      }
      
      if (Object.keys(updateData).length > 0) {
        const taskIdNumber = Number(taskToMove.id);
        if (isNaN(taskIdNumber)) {
            console.error(`[KanbanBoard.tsx] handleDragEnd - ID da tarefa inválido: ${taskToMove.id}`);
            toast.error('ID da tarefa inválido.');
            setActiveId(null);
            return;
        }
        console.log(`[KanbanBoard.tsx] handleDragEnd - Chamando updateTask com ID: ${taskIdNumber}, Dados:`, updateData);
        await taskService.updateTask(taskIdNumber, updateData);
        toast.success(`Tarefa "${taskToMove.title}" atualizada.`);
        if (onTasksUpdated) {
          await onTasksUpdated(); // Notifica o pai para recarregar rawTasks
        }
      }
      // Não é necessário um 'else if' aqui. Se updateData estiver vazio, nenhuma chamada API é feita.
      // O estado visual do dnd-kit é temporário; a fonte da verdade é atualizada via onTasksUpdated após sucesso da API.

    } catch (err) {
      console.error("Erro ao atualizar tarefa após drag-and-drop:", err);
      toast.error('Erro ao mover tarefa.');
      // Idealmente, o hook useProcessedKanbanData reverteria para o estado anterior
      // ou o onTasksUpdated traria o estado correto da API.
    } finally {
      setActiveId(null);
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
    // Notificar o componente pai sobre a atualização das tarefas
    if (onTasksUpdated) {
      await onTasksUpdated(); // Isso fará com que rawTasks seja recarregado
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
      // O onTasksUpdated será chamado pelo TaskDetailsModal ou handleTaskStatusChange se necessário
      // para recarregar os dados e refletir no rawTasks.
    } catch (err) {
      toast.error('Erro ao atualizar timer da tarefa.');
    }
  };

  // Função para lidar com a mudança de status de uma tarefa (ex: pelo temporizador)
  const handleTaskStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    const taskIdStr = String(taskId);
    const currentTask = processedTasksMap[taskIdStr];

    if (currentTask && currentTask.status !== newStatus) {
      try {
        await taskService.updateTask(taskId, { status: newStatus });
        toast.success(`Status da tarefa atualizado para ${newStatus}.`);
        if (onTasksUpdated) {
          await onTasksUpdated(); // Recarrega rawTasks
        }

        // Lógica do timer
        if (newStatus === 'em_andamento') {
          setTimerRunningTaskId(taskIdStr);
          setCurrentTimerValues(prev => ({ ...prev, [taskIdStr]: currentTask.timer || 0 }));
        } else if (timerRunningTaskId === taskIdStr) {
          // Se o timer estava rodando para esta tarefa e o status mudou, parar e salvar o timer.
          const currentTimerValue = currentTimerValues[taskIdStr] || currentTask.timer || 0;
          await taskService.updateTask(taskId, { timer: currentTimerValue });
          toast.info('Tempo da tarefa salvo.');
          setTimerRunningTaskId(null);
        }

      } catch (error) {
        toast.error('Erro ao atualizar status da tarefa.');
      }
    }
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
        await onTasksUpdated(); // Recarrega rawTasks (que agora incluirá a nova tarefa)
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
