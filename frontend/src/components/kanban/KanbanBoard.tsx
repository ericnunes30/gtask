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
import { PlusCircle, MoreHorizontal, Calendar, AlertCircle, Briefcase, Timer, Copy, Play, Pause } from 'lucide-react';
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
import { Task, TaskStatus, UpdateTaskRequest } from '@/common/types';
import { useBackendServices } from '@/hooks/useBackendServices';
import TaskDetailsModal from "@/components/tasks/TaskDetailsModal";
import useProcessedKanbanData from '@/hooks/useProcessedKanbanData';
import {
  KanbanTask,
  ViewMode,
  BoardMode,
  FiltersObject,
  ProcessedKanbanColumns,
  TasksMap,
  ProcessedColumnOrder,
  ProcessedKanbanColumn,
} from './kanbanTypes';
import { TaskForm } from '@/components/forms/TaskForm';
import { TaskFormRef } from '@/components/forms/TaskForm';
import { TaskTimer } from '@/components/tasks/TaskTimer';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/adapters/AuthContextAdapter';
import { useSocket } from '@/contexts/adapters/SocketContextAdapter';
import { calculateNewOrderForColumn } from './kanbanUtils';

const priorityMap = {
  alta: { label: 'Alta', variant: 'destructive' as const },
  media: { label: 'Média', variant: 'default' as const },
  baixa: { label: 'Baixa', variant: 'secondary' as const },
  urgente: { label: 'Urgente', variant: 'destructive' as const },
};

const statusMap: Record<TaskStatus, string> = {
  pendente: 'backlog',
  a_fazer: 'todo',
  em_andamento: 'inProgress',
  em_revisao: 'review',
  aguardando_cliente: 'waitingClient',
  concluido: 'done',
  cancelado: 'cancelled'
};

const columnToStatusMap: Record<string, TaskStatus> = {
  backlog: 'pendente',
  todo: 'a_fazer',
  inProgress: 'em_andamento',
  review: 'em_revisao',
  waitingClient: 'aguardando_cliente',
  done: 'concluido',
  cancelled: 'cancelado',
  overdue: 'a_fazer',
  today: 'em_andamento',
  tomorrow: 'a_fazer'
};

const statusColumnOrder = ['backlog', 'todo', 'inProgress', 'review', 'waitingClient', 'done', 'cancelled'];
const dateColumnOrder = ['overdue', 'today', 'tomorrow', 'future'];

interface KanbanBoardProps {
  rawTasks: KanbanTask[];
  viewMode: ViewMode;
  boardMode: BoardMode;
  filters: FiltersObject;
  projectId?: string;
  project?: any;
  onTaskStatusChange?: (task: KanbanTask, newStatus: TaskStatus, newOrder?: number) => Promise<void>;
  onGenericTaskUpdate?: () => Promise<void>;
  onUpdateTaskApi: (id: number, data: UpdateTaskRequest) => Promise<any>;
}

const TaskCard = ({
  task,
  onClick,
  onDuplicateTask,
  timerRunningTaskId,
  onStartTimer,
  onPauseTimer,
}: {
  task: KanbanTask, 
  onClick: () => void,
  onDuplicateTask?: (task: KanbanTask) => void, 
  timerRunningTaskId: string | null,
  onStartTimer: (task: KanbanTask) => void,
  onPauseTimer: (task: KanbanTask) => void,
}) => {

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const dateStr = date.toISOString().split('T')[0];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'Hoje';
    if (dateStr === tomorrowStr) return 'Amanhã';
    return date.toLocaleDateString('pt-BR');
  };

  const projectName = task.project?.title || `Projeto ${task.project_id}`;
  const isTimerRunning = timerRunningTaskId === String(task.id);
  const isInProgress = task.status === 'em_andamento';
  const cardClasses = `p-2 mb-2 bg-background rounded-md border shadow-sm
    ${isTimerRunning ? 'border-green-400 shadow-green-100' : ''}
    ${isInProgress && !isTimerRunning ? 'border-yellow-400' : ''}`;

  return (
    <div
      className={`${cardClasses} relative group cursor-pointer`}
      onClick={onClick}
    >
      <div className="text-xs text-muted-foreground mb-1">
        <Briefcase className="h-3 w-3 inline-block mr-1" />
        {projectName}
      </div>

      {onDuplicateTask && (
        <button
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 hover:bg-white shadow-sm border rounded p-1.5 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicateTask(task);
          }}
          title="Duplicar tarefa"
        >
          <Copy className="h-3 w-3 text-gray-600 hover:text-gray-800" />
        </button>
      )}

      <h4 className="text-sm font-medium mb-2">
        {isTimerRunning && (
          <Timer className="h-3 w-3 inline-block mr-1 text-green-500" />
        )}
        {task.title}
      </h4>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex -space-x-2 mr-1">
          {task.users && task.users.length > 0 ? (
            <>
              {task.users.slice(0, 1).map((user, index) => {
                const userId = typeof user === 'object' ? user.id : user;
                const userName = typeof user === 'object' && user.name ? user.name : null;
                
                let initials: string;
                if (userName && userName.trim()) {
                  if (userName.includes(' ')) {
                    initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                  } else {
                    initials = userName.substring(0, 2).toUpperCase();
                  }
                } else {
                  initials = `U${userId}`;
                }

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

        {task.due_date && (
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(task.due_date)}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Badge variant={priorityMap[task.priority]?.variant || 'default'} className="text-[9px] px-1 py-0 h-4 mr-3">
            {priorityMap[task.priority]?.label || 'Média'}
          </Badge>

          <div className="flex items-center gap-1 flex-shrink-0">
            <TaskTimer
              taskId={String(task.id)}
              initialTime={task.timer || 0}
              isRunning={isTimerRunning}
              compact={true}
            />
            {isTimerRunning ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Pausar timer"
                onClick={(e) => {
                  e.stopPropagation();
                  onPauseTimer(task);
                }}
              >
                <Pause className="h-3 w-3" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Iniciar timer"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartTimer(task);
                }}
              >
                <Play className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SortableTaskCard = ({
  id,
  task,
  onClick,
  onDuplicateTask,
  timerRunningTaskId,
  onStartTimer,
  onPauseTimer,
}: {
  id: string,
  task: KanbanTask,
  onClick: () => void,
  onDuplicateTask?: (task: KanbanTask) => void,
  timerRunningTaskId: string | null,
  onStartTimer: (task: KanbanTask) => void,
  onPauseTimer: (task: KanbanTask) => void,
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
        onDuplicateTask={onDuplicateTask}
        timerRunningTaskId={timerRunningTaskId}
        onStartTimer={onStartTimer}
        onPauseTimer={onPauseTimer}
      />
    </div>
  );
};

const DroppableColumn = ({ id, children }: { id: string, children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  React.useEffect(() => {
  }, [isOver, id]);

  return (
    <div
      ref={setNodeRef}
      className={`p-2 flex-1 min-h-[50px] transition-colors duration-200 ${isOver ? 'bg-accent/20 ring-2 ring-accent/50' : ''}`}
      data-droppable-id={id}
    >
      {children}
    </div>
  );
};

const Column = ({
  column,
  tasks,
  onAddTask,
  onTaskClick,
  onDuplicateTask,
  id,
  timerRunningTaskId,
  boardMode,
  onStartTimer,
  onPauseTimer,
}: {
  column: ProcessedKanbanColumn,
  tasks: KanbanTask[],
  onAddTask: (columnId: string) => void,
  onTaskClick: (task: KanbanTask) => void,
  onDuplicateTask?: (task: KanbanTask) => void;
  id: string,
  timerRunningTaskId: string | null,
  boardMode: BoardMode;
  onStartTimer: (task: KanbanTask) => void,
  onPauseTimer: (task: KanbanTask) => void,
}) => {
  const permissions = usePermissions();
  const showAddTaskButton = !(permissions.isMember && (boardMode === 'tasks-view' || boardMode === 'project-view'));

  return (
    <div
      className="kanban-column flex-shrink-0 w-[280px] bg-card flex flex-col border rounded-lg overflow-hidden"
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
              onDuplicateTask={onDuplicateTask}
              timerRunningTaskId={timerRunningTaskId}
              onStartTimer={onStartTimer}
              onPauseTimer={onPauseTimer}
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
    onTaskStatusChange,
    onGenericTaskUpdate
  } = props;

  const {
    columns: processedColumns,
    tasksMap: processedTasksMap,
    columnOrder: processedColumnOrder,
    isLoading: processedDataIsLoading,
    error: processedDataError,
  } = useProcessedKanbanData({
    rawTasks,
    viewMode,
    boardMode,
    filters,
    projectId: projectId !== undefined ? String(projectId) : undefined,
  });

  const { user } = useAuth();
  const permissions = usePermissions();
  const { socket, isConnected } = useSocket();

  const finalColumnOrder = useMemo(() => {
    let order = [...processedColumnOrder];
    if (permissions.isMember) {
      order = order.filter(colId => colId !== 'backlog' && colId !== 'waitingClient');
    }
    if (!permissions.isAdmin) {
      order = order.filter(colId => colId !== 'cancelled');
    }
    return order;
  }, [processedColumnOrder, permissions.isMember, permissions.isAdmin]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<KanbanTask | null>(null);
  const [isCreateEditDialogOpen, setIsCreateEditDialogOpen] = useState(false);
  const [currentColumnIdForNewTask, setCurrentColumnIdForNewTask] = useState<string | null>(null);
  const [createTaskFormInstanceId, setCreateTaskFormInstanceId] = useState<string | null>(null);
  const [timerRunningTaskId, setTimerRunningTaskId] = useState<string | null>(null);
  const createTaskFormRef = useRef<TaskFormRef>(null);
  const [duplicateTaskData, setDuplicateTaskData] = useState<KanbanTask | null>(null);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);

  const { tasks } = useBackendServices();
  const { mutateAsync: updateTask } = tasks.useUpdateTask();
  const { mutateAsync: createTask } = tasks.useCreateTask();

  const handleUpdateTaskApi = useCallback(async (id: number, data: UpdateTaskRequest) => {
    return updateTask({ id, data });
  }, [updateTask]);

  const handleCloseKanbanDialog = () => {
    setIsCreateEditDialogOpen(false);
    setCurrentColumnIdForNewTask(null); 
    setDuplicateTaskData(null);
    setIsDuplicateMode(false);
    setCreateTaskFormInstanceId(null); 
  };

  const handleDuplicateTask = useCallback((task: KanbanTask) => {
    const duplicatedData = {
      ...task,
      title: `${task.title} - Cópia`,
      status: 'a_fazer' as TaskStatus,
      timer: 0,
      order: undefined,
      id: undefined as any,
      created_at: undefined,
      updated_at: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    };

    setDuplicateTaskData(duplicatedData);
    setIsDuplicateMode(true);
    setCreateTaskFormInstanceId(`duplicate-task-${Date.now()}`);
    setIsCreateEditDialogOpen(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useImperativeHandle(ref, () => ({}));

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleTimerStarted = (data: { taskId: number; userId: number }) => {
      setTimerRunningTaskId(String(data.taskId));
    };

    const handleTimerPaused = (data: { taskId: number; userId: number; seconds: number }) => {
      setTimerRunningTaskId((prev) => (prev === String(data.taskId) ? null : prev));
      if (onGenericTaskUpdate) {
        onGenericTaskUpdate();
      }
    };

    socket.on('timer.started', handleTimerStarted);
    socket.on('timer.paused', handleTimerPaused);

    return () => {
      socket.off('timer.started', handleTimerStarted);
      socket.off('timer.paused', handleTimerPaused);
    };
  }, [socket, isConnected, onGenericTaskUpdate]);

  // Robust room membership: join new task rooms, leave removed ones, avoid churn
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!socket || !isConnected) return;

    const next = new Set(Object.keys(processedTasksMap));
    const prev = joinedRoomsRef.current;

    // Join new rooms
    next.forEach((id) => {
      if (!prev.has(id)) {
        socket.emit('join-task-room', id);
        prev.add(id);
      }
    });

    // Leave removed rooms
    Array.from(prev).forEach((id) => {
      if (!next.has(id)) {
        socket.emit('leave-task-room', id);
        prev.delete(id);
      }
    });

    return () => {
      // On disconnect/unmount, leave all
      if (!isConnected) {
        Array.from(prev).forEach((id) => {
          socket.emit('leave-task-room', id);
        });
        prev.clear();
      }
    };
  }, [socket, isConnected, processedTasksMap]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(String(active.id));
  };

  const findColumnOfTask = useCallback((taskId: string): string | null => {
    for (const [columnId, columnData] of Object.entries(processedColumns)) {
      if (columnData.taskIds.includes(taskId)) {
        return columnId;
      }
    }
    return null;
  }, [processedColumns]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (activeIdStr === overIdStr && !processedColumns[overIdStr]) {
       setActiveId(null);
      return;
    }

    const sourceColumnId = findColumnOfTask(activeIdStr);
    if (!sourceColumnId) {
      setActiveId(null);
      return;
    }

    let destinationColumnId = overIdStr;
    if (!(overIdStr in processedColumns)) {
      const columnContainingOverTask = findColumnOfTask(overIdStr);
      if (columnContainingOverTask) {
        destinationColumnId = columnContainingOverTask;
      } else {
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

    try {
      let newApiStatus: TaskStatus | undefined = undefined;
      let newOrderCalculated: number | undefined = undefined;
      let statusForPropCallback: TaskStatus = taskToMove.status;

      if (sourceColumnId !== destinationColumnId) {
        if (viewMode === 'status') {
          const potentialNewStatus = columnToStatusMap[destinationColumnId];
          if (potentialNewStatus && potentialNewStatus !== taskToMove.status) {
            newApiStatus = potentialNewStatus;
            statusForPropCallback = newApiStatus;
          }
        }
      }

      const tasksInDestColumnFiltered = (processedColumns[destinationColumnId]?.taskIds || [])
        .filter(id => id !== activeIdStr)
        .map(id => processedTasksMap[id])
        .filter(Boolean) as KanbanTask[];

      tasksInDestColumnFiltered.sort((a, b) => (a.order || 0) - (b.order || 0));

      newOrderCalculated = calculateNewOrderForColumn(tasksInDestColumnFiltered, overIdStr, activeIdStr);

      const roundedNewOrder = newOrderCalculated !== undefined ? parseFloat(newOrderCalculated.toFixed(5)) : undefined;

      const statusChanged = newApiStatus !== undefined && newApiStatus !== taskToMove.status;
      const orderChanged = roundedNewOrder !== undefined && roundedNewOrder !== taskToMove.order;

      const taskToMoveIdStr = String(taskToMove.id);
      const finalDestStatus = newApiStatus || taskToMove.status;

      if (timerRunningTaskId === taskToMoveIdStr && finalDestStatus !== 'em_andamento') {
        socket.emit('timer.pause', { taskId: taskToMove.id });
        setTimerRunningTaskId(null); // optimistic UI to avoid stale state
      }

      if (statusChanged || orderChanged) {
        const updateData: UpdateTaskRequest = { status: finalDestStatus };
        if (roundedNewOrder !== undefined) {
          updateData.order = roundedNewOrder;
        }
        
        await updateTask({ id: Number(taskToMove.id), data: updateData });
        toast.success(`Tarefa "${taskToMove.title}" movida.`);
        
        if (onGenericTaskUpdate) {
          await onGenericTaskUpdate();
        }
      }

      if (finalDestStatus === 'em_andamento') {
        if (timerRunningTaskId && timerRunningTaskId !== taskToMoveIdStr) {
          socket.emit('timer.pause', { taskId: parseInt(timerRunningTaskId) });
        }
        socket.emit('timer.start', { taskId: taskToMove.id });
        setTimerRunningTaskId(taskToMoveIdStr); // optimistic start for UI
      }

    } catch (err) {
      console.error("Erro ao processar drag-and-drop no KanbanBoard:", err);
      toast.error('Erro ao mover tarefa.');
    } finally {
      setActiveId(null);
    }
  };

  // WS helpers to align status with timer actions
  const handleStartTimer = async (task: KanbanTask) => {
    try {
      // Ensure only one running timer per user
      if (timerRunningTaskId && timerRunningTaskId !== String(task.id)) {
        socket?.emit('timer.pause', { taskId: parseInt(timerRunningTaskId) });
      }
      // Move task to Em Andamento if needed
      if (task.status !== 'em_andamento') {
        await updateTask({ id: Number(task.id), data: { status: 'em_andamento' } });
        if (onGenericTaskUpdate) await onGenericTaskUpdate();
      }
      socket?.emit('timer.start', { taskId: Number(task.id) });
      setTimerRunningTaskId(String(task.id)); // optimistic UI
    } catch (e) {
      console.error('Falha ao iniciar timer:', e);
      toast.error('Não foi possível iniciar o timer.');
    }
  };

  const handlePauseTimer = async (task: KanbanTask) => {
    try {
      socket?.emit('timer.pause', { taskId: Number(task.id) });
      // Move task para A Fazer quando usuário pausa manualmente
      if (task.status !== 'a_fazer') {
        await updateTask({ id: Number(task.id), data: { status: 'a_fazer' } });
        if (onGenericTaskUpdate) await onGenericTaskUpdate();
      }
      setTimerRunningTaskId((prev) => (prev === String(task.id) ? null : prev)); // optimistic UI
    } catch (e) {
      console.error('Falha ao pausar timer:', e);
      toast.error('Não foi possível pausar o timer.');
    }
  };

  const handleTaskClick = (task: KanbanTask) => {
    setSelectedTaskForModal(task);
    setIsTaskDetailsModalOpen(true);
  };

  const handleTaskModalClose = () => {
    setIsTaskDetailsModalOpen(false);
    setSelectedTaskForModal(null);
  };

  const handleTaskUpdated = async () => {
    if (onGenericTaskUpdate) {
      await onGenericTaskUpdate();
    }
  };

  const handleTaskFormSuccess = async (newTaskFromForm: Task) => {
    try {
      handleCloseKanbanDialog();
      if (isDuplicateMode) {
        toast.success('Tarefa duplicada com sucesso no quadro!');
      } else {
        toast.success('Tarefa criada com sucesso no quadro!');
      }
    } catch (dialogOrToastError) {
      console.error('[KanbanBoard.tsx] Erro ao fechar diálogo ou mostrar toast de sucesso:', dialogOrToastError);
    }

    if (onGenericTaskUpdate) {
      try {
        await onGenericTaskUpdate();
      } catch (updateError) {
        console.error('[KanbanBoard.tsx] Erro durante onGenericTaskUpdate (atualização do quadro):', updateError);
        toast.warning('A tarefa foi salva, mas houve um problema ao atualizar o quadro. Tente atualizar a página.');
      }
    }
    
    if (isDuplicateMode) {
      setIsDuplicateMode(false);
      setDuplicateTaskData(null);
    }
  };

  if (processedDataIsLoading) {
    return (
      <div className="h-full">
        <div className="kanban-container flex gap-4 h-full overflow-x-auto overflow-y-hidden pb-4" style={{ minWidth: 'calc(280px * 7 + 1rem * 6)' }}>
          {(processedColumnOrder.length > 0 ? processedColumnOrder : statusColumnOrder).map(columnId => (
            <div key={columnId} className="kanban-column flex-shrink-0 w-[280px] bg-card flex flex-col border rounded-lg overflow-hidden">
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
        <div className="kanban-container flex gap-4 h-full w-full overflow-x-auto overflow-y-hidden" style={{ minWidth: 'calc(280px * 7 + 1rem * 6)' }}>
          {finalColumnOrder.map(columnId => {
            const columnData = processedColumns[columnId];
            if (!columnData) {
              console.warn(`Dados da coluna ${columnId} não encontrados.`);
              return (
                <div key={columnId} className="kanban-column flex-shrink-0 w-[280px] bg-card flex flex-col border rounded-lg overflow-hidden p-3">
                  <h3 className="font-medium">{columnId} (Erro)</h3>
                </div>
              );
            }

            const tasksInColumn = columnData.taskIds.map(taskId => processedTasksMap[taskId]).filter(Boolean) as KanbanTask[];

            return (
              <Column
                key={columnData.id}
                id={columnData.id}
                column={columnData}
                tasks={tasksInColumn}
                boardMode={boardMode}
                onAddTask={(colId) => {
                  setCurrentColumnIdForNewTask(colId);
                  setCreateTaskFormInstanceId(`kanban-create-task-${Date.now()}`);
                  setIsCreateEditDialogOpen(true);
                }}
                onTaskClick={handleTaskClick}
                onDuplicateTask={handleDuplicateTask}
                timerRunningTaskId={timerRunningTaskId}
                onStartTimer={handleStartTimer}
                onPauseTimer={handlePauseTimer}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-[280px] opacity-80 shadow-lg">
              <TaskCard
                onClick={() => handleTaskClick(activeTask)}
                timerRunningTaskId={timerRunningTaskId}
                onDuplicateTask={handleDuplicateTask}
                task={activeTask}
                onStartTimer={handleStartTimer}
                onPauseTimer={handlePauseTimer}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedTaskForModal && typeof selectedTaskForModal.id === 'number' && (
        <TaskDetailsModal
          isOpen={isTaskDetailsModalOpen}
          onClose={handleTaskModalClose}
          taskId={selectedTaskForModal.id}
          onTaskUpdated={handleTaskUpdated}
          timerRunningTaskId={timerRunningTaskId}
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
            setIsCreateEditDialogOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isDuplicateMode ? 'Duplicar Tarefa' : 'Criar Nova Tarefa'}</DialogTitle>
            <DialogDescription>
              {isDuplicateMode 
                ? 'Edite os detalhes da tarefa duplicada conforme necessário.'
                : 'Preencha os detalhes da tarefa. Clique em salvar quando terminar.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <TaskForm
              key={createTaskFormInstanceId || 'kanban-create-form'}
              ref={createTaskFormRef}
              onSuccess={handleTaskFormSuccess}
              defaultProjectId={projectId ? Number(projectId) : undefined}
              defaultStatus={isDuplicateMode 
                ? duplicateTaskData?.status 
                : (currentColumnIdForNewTask ? columnToStatusMap[currentColumnIdForNewTask] : undefined)
              }
              formInstanceId={createTaskFormInstanceId || undefined}
              initialData={isDuplicateMode ? duplicateTaskData : undefined}
              isDuplicateMode={isDuplicateMode}
            />
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseKanbanDialog}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
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