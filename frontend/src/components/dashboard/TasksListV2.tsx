import React, { useState, useCallback, useImperativeHandle, forwardRef, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, AlertCircle, Edit, Trash2, MoreHorizontal, Clock, Eye, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { LazyTaskDetailsModal } from "@/components/tasks/LazyTaskDetailsModal"; // Nova arquitetura
import { useModal } from "@/hooks/useModal"; // Hook customizado
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TaskTimer } from '../tasks/TaskTimer';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/utils/utils";
import { Task, TaskPriority, TaskStatus, UpdateTaskRequest, Team } from '@/common/types';
import { useBackendServices } from '@/hooks/useBackendServices';
import { toast } from "sonner";
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { TaskModalProvider } from '@/contexts/TaskModalContext'; // Context provider

// Reutilizando funções auxiliares existentes
const getPriorityColor = (priority: TaskPriority): "destructive" | "default" | "secondary" => {
  switch (priority) {
    case "alta":
    case "urgente":
      return "destructive";
    case "media":
      return "default";
    case "baixa":
    default:
      return "secondary";
  }
};

const getPriorityLabel = (priority: TaskPriority): string => {
  switch (priority) {
    case "alta": return "Alta";
    case "urgente": return "Urgente";
    case "media": return "Média";
    case "baixa": return "Baixa";
    default: return "Média";
  }
};

const getStatusLabel = (status: TaskStatus): string => {
  switch (status) {
    case "pendente": return "Pendente";
    case "a_fazer": return "A Fazer";
    case "em_andamento": return "Em Andamento";
    case "em_revisao": return "Em Revisão";
    case "aguardando_cliente": return "Aguardando Cliente";
    case "concluido": return "Concluído";
    case "cancelado": return "Cancelado";
    default: return "A Fazer";
  }
};

const getStatusColor = (status: TaskStatus): "secondary" | "default" | "destructive" | "outline" => {
  switch (status) {
    case "pendente":
    case "a_fazer":
      return "secondary";
    case "em_andamento":
      return "default";
    case "em_revisao":
      return "outline";
    case "aguardando_cliente":
      return "outline";
    case "concluido":
      return "default";
    case "cancelado":
      return "destructive";
    default:
      return "secondary";
  }
};

// Props do componente
interface TasksListProps {
  tasks: Task[];
  loading: boolean;
  error?: string;
  onTasksChange: () => void;
  selectedProjectId?: number | null;
  selectedTeamId?: number | null;
  selectedUserId?: number | null;
  selectedStatus?: TaskStatus | null;
  selectedPriority?: TaskPriority | null;
  showActions?: boolean;
  compact?: boolean;
  showTimer?: boolean;
}

export interface TasksListRef {
  refreshTasks: () => void;
}

// Componente interno da lista (sem provider)
const TasksListInternal = forwardRef<TasksListRef, TasksListProps>((props, ref) => {
  const {
    tasks,
    loading,
    error,
    onTasksChange,
    selectedProjectId,
    selectedTeamId,
    selectedUserId,
    selectedStatus,
    selectedPriority,
    showActions = true,
    compact = false,
    showTimer = true
  } = props;

  // Estados locais
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [timerRunningTaskId, setTimerRunningTaskId] = useState<string | null>(null);
  const [currentTimerValues, setCurrentTimerValues] = useState<Record<string, number>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Hooks
  const { user } = useAuth();
  const { canEditTask, canDeleteTask } = usePermissions();
  const { deleteTask, duplicateTask } = useBackendServices();
  const taskModal = useModal(); // Hook customizado para controle do modal

  // Expor métodos via ref
  useImperativeHandle(ref, () => ({
    refreshTasks: () => {
      onTasksChange();
    }
  }));

  // Handlers
  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    taskModal.open();
  };

  const handleModalClose = () => {
    setSelectedTaskId(null);
    taskModal.close();
  };

  const handleTaskUpdated = () => {
    onTasksChange();
  };

  const handleDuplicateTask = async (task: Task) => {
    try {
      await duplicateTask(task.id);
      toast.success("Tarefa duplicada com sucesso!");
      onTasksChange();
    } catch (error) {
      console.error('Erro ao duplicar tarefa:', error);
      toast.error("Erro ao duplicar tarefa");
    }
  };

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;

    try {
      await deleteTask(taskToDelete.id);
      toast.success("Tarefa excluída com sucesso!");
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
      onTasksChange();
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      toast.error("Erro ao excluir tarefa");
    }
  };

  // Renderização de loading
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // Renderização de erro
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Renderização da tabela
  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Título</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Usuários</TableHead>
              {showTimer && <TableHead>Tempo</TableHead>}
              <TableHead>Vencimento</TableHead>
              {showActions && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  Nenhuma tarefa encontrada.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow 
                  key={task.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleTaskClick(task)}
                >
                  <TableCell className="font-medium">
                    <div className="max-w-[280px] truncate" title={task.title}>
                      {task.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityColor(task.priority)}>
                      {getPriorityLabel(task.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(task.status)}>
                      {getStatusLabel(task.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[150px] truncate">
                      {task.project?.title || 'Sem projeto'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex -space-x-1">
                      {task.users?.slice(0, 3).map((user, index) => (
                        <div
                          key={typeof user === 'number' ? user : user.id}
                          className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center border border-background"
                          title={typeof user === 'number' ? `Usuário ${user}` : user.name}
                        >
                          {typeof user === 'number' ? 'U' : user.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {task.users && task.users.length > 3 && (
                        <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center border border-background">
                          +{task.users.length - 3}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  {showTimer && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <TaskTimer
                        taskId={task.id.toString()}
                        onStatusChange={(status) => {
                          // Atualizar status local e global
                          if (status === 'Em Andamento') {
                            setTimerRunningTaskId(task.id.toString());
                          } else {
                            setTimerRunningTaskId(null);
                          }
                        }}
                        onTimerUpdate={(newValue) => {
                          setCurrentTimerValues(prev => ({
                            ...prev,
                            [task.id.toString()]: newValue
                          }));
                        }}
                        initialTime={task.timer || 0}
                        isRunning={timerRunningTaskId === task.id.toString()}
                        compact={true}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    {task.due_date ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleTaskClick(task)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateTask(task)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                          {canDeleteTask(task) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDeleteClick(task)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de detalhes com nova arquitetura */}
      <LazyTaskDetailsModal
        isOpen={taskModal.isOpen}
        onClose={handleModalClose}
        taskId={selectedTaskId}
        onTaskUpdated={handleTaskUpdated}
        timerRunningTaskId={timerRunningTaskId}
        currentTimerValues={currentTimerValues}
        setCurrentTimerValues={setCurrentTimerValues}
        setTimerRunningTaskId={setTimerRunningTaskId}
        onDuplicateTask={handleDuplicateTask}
      />

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir tarefa</DialogTitle>
            <DialogDescription>
              Tem certeza de que deseja excluir a tarefa "{taskToDelete?.title}"? 
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

// Componente exportado com Provider
const TasksListV2 = forwardRef<TasksListRef, TasksListProps>((props, ref) => {
  return (
    <TaskModalProvider>
      <TasksListInternal {...props} ref={ref} />
    </TaskModalProvider>
  );
});

TasksListV2.displayName = "TasksListV2";
TasksListInternal.displayName = "TasksListInternal";

export default TasksListV2;