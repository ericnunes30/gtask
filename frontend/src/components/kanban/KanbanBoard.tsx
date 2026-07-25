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
import { PlusCircle, MoreHorizontal, Calendar, AlertCircle, Timer, Copy, Play, Pause, MessageSquare, Inbox, Circle, PlayCircle, Eye, Hourglass, CheckCircle2, Ban } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Task, TaskStatus, UpdateTaskRequest } from '@/utils/commonTypes';
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
  alta: { label: 'Alta', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  media: { label: 'Média', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  baixa: { label: 'Baixa', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700 border-red-200' },
};

// Paleta de cores para tags de projeto (estilo CRM da referência)
const projectTagColors = [
  { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
];

const getProjectTagStyle = (projectName: string) => {
  let hash = 0;
  for (let i = 0; i < projectName.length; i++) {
    hash = projectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % projectTagColors.length;
  return projectTagColors[index];
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

// Cores do header de cada coluna (Opção B — header sólido colorido)
type ColumnTheme = { bg: string; bgHover: string; text: string; border: string };
const columnThemeMap: Record<string, ColumnTheme> = {
  // Modo status
  backlog:        { bg: 'bg-slate-500',    bgHover: 'hover:bg-slate-600',    text: 'text-white', border: 'border-slate-500' },
  todo:           { bg: 'bg-sky-600',      bgHover: 'hover:bg-sky-700',      text: 'text-white', border: 'border-sky-600' },
  inProgress:     { bg: 'bg-amber-500',    bgHover: 'hover:bg-amber-600',    text: 'text-white', border: 'border-amber-500' },
  review:         { bg: 'bg-violet-600',   bgHover: 'hover:bg-violet-700',   text: 'text-white', border: 'border-violet-600' },
  waitingClient:  { bg: 'bg-cyan-600',     bgHover: 'hover:bg-cyan-700',     text: 'text-white', border: 'border-cyan-600' },
  done:           { bg: 'bg-emerald-600',  bgHover: 'hover:bg-emerald-700',  text: 'text-white', border: 'border-emerald-600' },
  cancelled:      { bg: 'bg-rose-700',     bgHover: 'hover:bg-rose-800',     text: 'text-white', border: 'border-rose-700' },
  // Modo data
  overdue:        { bg: 'bg-red-600',      bgHover: 'hover:bg-red-700',      text: 'text-white', border: 'border-red-600' },
  tomorrow:       { bg: 'bg-cyan-600',     bgHover: 'hover:bg-cyan-700',     text: 'text-white', border: 'border-cyan-600' },
  future:         { bg: 'bg-slate-500',    bgHover: 'hover:bg-slate-600',    text: 'text-white', border: 'border-slate-500' },
};

const defaultColumnTheme: ColumnTheme = {
  bg: 'bg-slate-500', bgHover: 'hover:bg-slate-600', text: 'text-white', border: 'border-slate-500',
};

// Icones para o header de cada coluna (lucide-react)
import type { LucideIcon } from 'lucide-react';
const columnIconMap: Record<string, LucideIcon> = {
  backlog:        Inbox,
  todo:           Circle,
  inProgress:     PlayCircle,
  review:         Eye,
  waitingClient:  Hourglass,
  done:           CheckCircle2,
  cancelled:      Ban,
  overdue:        AlertCircle,
  tomorrow:       Calendar,
  future:         Calendar,
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
  const tagStyle = getProjectTagStyle(projectName);

  const commentsCount = task.comments?.length || 0;

  return (
    <div
      className={`
        relative group cursor-pointer p-4 mb-2.5 bg-white rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.04)]
        hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow duration-200
        ${isTimerRunning ? 'ring-2 ring-green-400' : ''}
        ${isInProgress && !isTimerRunning ? 'ring-1 ring-amber-300' : ''}
      `}
      onClick={onClick}
    >
      {onDuplicateTask && (
        <button
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 hover:bg-white shadow-sm border rounded-md p-1.5 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicateTask(task);
          }}
          title="Duplicar tarefa"
        >
          <Copy className="h-3.5 w-3.5 text-gray-600 hover:text-gray-800" />
        </button>
      )}

      {/* Topo: tag do projeto + data */}
      <div className="flex items-center justify-between gap-2 mb-2.5 pr-6">
        <span className={`
          inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border
          ${tagStyle.bg} ${tagStyle.text} ${tagStyle.border}
        `}>
          {projectName}
        </span>

        {task.due_date && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(task.due_date)}</span>
          </div>
        )}
      </div>

      {/* Título */}
      <h4 className="text-[13.5px] font-semibold text-foreground leading-snug mb-3">
        <span className="inline-flex items-center gap-1">
          {isTimerRunning && (
            <Timer className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
          )}
          <span>{task.title}</span>
        </span>
      </h4>

      {/* Footer: avatares, prioridade | comentários, timer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-black/[0.06]">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {task.users && task.users.length > 0 ? (
              <>
                {task.users.slice(0, 2).map((user, index) => {
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
                    <Avatar key={index} className="h-5 w-5 border-2 border-white">
                      <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  );
                })}

                {task.users.length > 2 && (
                  <Avatar className="h-5 w-5 border-2 border-white bg-muted">
                    <AvatarFallback className="text-[8px] text-muted-foreground">
                      +{task.users.length - 2}
                    </AvatarFallback>
                  </Avatar>
                )}
              </>
            ) : (
              <Avatar className="h-5 w-5 border-2 border-white">
                <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                  ?
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          <span className={`
            inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border
            ${priorityMap[task.priority]?.color || 'bg-gray-100 text-gray-700 border-gray-200'}
          `}>
            {priorityMap[task.priority]?.label || 'Média'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {commentsCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{commentsCount}</span>
            </div>
          )}

          <div className="flex items-center gap-1">
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
                className="h-7 w-7"
                title="Pausar timer"
                onClick={(e) => {
                  e.stopPropagation();
                  onPauseTimer(task);
                }}
              >
                <Pause className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Iniciar timer"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartTimer(task);
                }}
              >
                <Play className="h-3.5 w-3.5" />
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
    transition: isDragging ? transition : 'none',
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
      className={`
        px-3 py-3 flex-1 overflow-y-auto transition-colors duration-200
        ${isOver ? 'bg-sky-50 ring-2 ring-sky-300 ring-inset' : ''}
      `}
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
  const theme = columnThemeMap[id] || defaultColumnTheme;
  const ColumnIcon = columnIconMap[id];

  return (
    <div
      className={`kanban-column flex-shrink-0 w-[300px] h-full flex flex-col overflow-hidden border-r border-b border-border/30 bg-white`}
      data-column-id={id}
    >
      <div className={`px-4 py-2.5 ${theme.bg} ${theme.text} flex-shrink-0`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {ColumnIcon && <ColumnIcon className="h-4 w-4 flex-shrink-0 opacity-90" />}
            <h3 className="font-semibold text-[13px] tracking-tight truncate">
              {column.title}
            </h3>
          </div>
          <span className="text-[12px] font-semibold tabular-nums opacity-90">
            {tasks.length}
          </span>
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

  const [localRawTasks, setLocalRawTasks] = useState<KanbanTask[]>(rawTasks);

  const {
    columns: processedColumns,
    tasksMap: processedTasksMap,
    columnOrder: processedColumnOrder,
    isLoading: processedDataIsLoading,
    error: processedDataError,
  } = useProcessedKanbanData({
    rawTasks: localRawTasks,
    viewMode,
    boardMode,
    filters,
    projectId: projectId !== undefined ? String(projectId) : undefined,
  });

  useEffect(() => {
    setLocalRawTasks(rawTasks);
  }, [rawTasks]);

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
        
        // Optimistic update: move task locally immediately so it snaps to the new column
        setLocalRawTasks(prev => prev.map(t => 
          String(t.id) === taskToMoveIdStr 
            ? { ...t, status: finalDestStatus, order: roundedNewOrder ?? t.order } 
            : t
        ));
        
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
        <div className="kanban-container flex gap-0 h-full overflow-x-auto overflow-y-hidden pb-4 px-1" style={{ minWidth: 'calc(300px * 7 + 0px)' }}>
          {(processedColumnOrder.length > 0 ? processedColumnOrder : statusColumnOrder).map(columnId => {
            const theme = columnThemeMap[columnId] || defaultColumnTheme;
            return (
            <div key={columnId} className={`kanban-column flex-shrink-0 w-[300px] h-full flex flex-col overflow-hidden border-r border-b border-border/30 bg-white`}>
              <div className={`px-4 py-3 ${theme.bg} ${theme.text}`}>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24 bg-white/30" />
                  <Skeleton className="h-5 w-7 rounded-full bg-white/30" />
                </div>
              </div>
              <div className="p-3 flex-1 overflow-y-auto">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="p-4 mb-3 bg-white rounded-xl border shadow-sm">
                    <Skeleton className="h-5 w-20 rounded-md mb-3" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-4 w-14 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            );
          })}
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
        <div className="kanban-container flex gap-0 h-full w-full overflow-x-auto overflow-y-hidden" style={{ minWidth: 'calc(280px * 7 + 0px)' }}>
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