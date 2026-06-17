import React from 'react';
import { Task, TaskPriority, TaskStatus } from '@/utils/commonTypes';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/utils";
import { CalendarIcon, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { useSocket } from '@/contexts/adapters/SocketContextAdapter';

interface TaskPropertiesProps {
  task: Task;
  isEditMode: boolean;
  editedTask?: Partial<Task> | null;
  onFieldChange: (field: keyof Task, value: any) => void;
  updateTask: (data: { id: number; data: Partial<Task> }) => Promise<any>;
  onTaskUpdated: () => void;
  setTask: (task: Task | null) => void;
}

// Helper functions from the old component
const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'pendente': return 'Pendente';
    case 'a_fazer': return 'A Fazer';
    case 'em_andamento': return 'Em Andamento';
    case 'em_revisao': return 'Em Revisão';
    case 'concluido': return 'Concluído';
    case 'aguardando_cliente': return 'Aguardando Cliente';
    case 'cancelado': return 'Cancelado';
    default: return 'Desconhecido';
  }
};

const getStatusClass = (status?: string): string => {
  switch (status) {
    case 'pendente': return '';
    case 'a_fazer': return 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200';
    case 'em_andamento': return 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200';
    case 'em_revisao': return 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200';
    case 'aguardando_cliente': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200';
    case 'concluido': return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200';
    case 'cancelado': return 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200';
    default: return '';
  }
};

const getStatusIndicatorClass = (status?: string): string => {
    switch (status) {
      case 'pendente': return 'bg-gray-400';
      case 'a_fazer': return 'bg-blue-500';
      case 'em_andamento': return 'bg-amber-500';
      case 'em_revisao': return 'bg-purple-500';
      case 'aguardando_cliente': return 'bg-yellow-500';
      case 'concluido': return 'bg-green-500';
      case 'cancelado': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

const getPriorityClass = (priority?: string): string => {
  switch (priority) {
    case 'baixa': return 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200';
    case 'media': return 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-200';
    case 'alta': return 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200';
    case 'urgente': return 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200';
    default: return '';
  }
};

const formatPriority = (priority?: TaskPriority) => {
    switch (priority) {
      case 'alta':
        return { label: 'Alta', variant: "destructive" as const };
      case 'urgente':
        return { label: 'Urgente', variant: "destructive" as const };
      case 'media':
        return { label: 'Média', variant: "default" as const };
      case 'baixa':
        return { label: 'Baixa', variant: "secondary" as const };
      default:
        return { label: 'Média', variant: "default" as const };
    }
  };

const isValidDate = (dateString?: string | Date): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

const formatDate = (dateString?: string) => {
    if (!dateString || !isValidDate(dateString)) return '';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

const TaskProperties: React.FC<TaskPropertiesProps> = ({
  task,
  isEditMode,
  editedTask,
  onFieldChange,
  updateTask,
  onTaskUpdated,
  setTask
}) => {
  const permissions = usePermissions();
  const priorityInfo = formatPriority(task.priority);
  const { socket } = useSocket();

  const allStatuses: TaskStatus[] = ['pendente', 'a_fazer', 'em_andamento', 'em_revisao', 'aguardando_cliente', 'concluido', 'cancelado'];
  const availableStatuses = permissions.isMember
    ? allStatuses.filter(status => status !== 'pendente' && status !== 'aguardando_cliente' && status !== 'cancelado')
    : (permissions.isAdmin ? allStatuses : allStatuses.filter(status => status !== 'cancelado'));

  const handleQuickStatusChange = async (newStatus: TaskStatus) => {
    if (!task || task.status === newStatus) return;

    try {
      const taskData: { status: TaskStatus } = { status: newStatus };
      await updateTask({ id: task.id, data: taskData });
      setTask({ ...task, status: newStatus });
      toast.success(`Status alterado para ${getStatusLabel(newStatus)}`);
      onTaskUpdated();

      // Start/pause timer conforme mudança de status
      if (newStatus === 'em_andamento') {
        socket?.emit('timer.start', { taskId: Number(task.id) });
      } else if (task.status === 'em_andamento' && newStatus !== 'em_andamento') {
        socket?.emit('timer.pause', { taskId: Number(task.id) });
      }
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      toast.error('Erro ao alterar status da tarefa. Tente novamente.');
    }
  };

  return (
    <div className="space-y-5 mt-4">
      {/* Datas */}
      <div className="flex items-center gap-3">
        <div className="w-6 flex justify-center">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="w-28">
          <div className="text-sm font-medium">Datas</div>
        </div>
        {isEditMode && !permissions.isMember ? (
          <div className="flex gap-2 items-center">
            <div className="flex flex-col">
              <label className="text-xs text-muted-foreground">Início</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full pl-3 text-left font-normal text-sm",
                      !editedTask?.start_date && !task.start_date && "text-muted-foreground"
                    )}
                  >
                    {editedTask?.start_date || task.start_date ? (
                      format(new Date(editedTask.start_date || task.start_date!), "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <ShadcnCalendar
                    mode="single"
                    selected={editedTask?.start_date ? new Date(editedTask.start_date) : (task.start_date ? new Date(task.start_date) : undefined)}
                    onSelect={(selectedDate) => onFieldChange('start_date', selectedDate ? selectedDate.toISOString() : null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex flex-col">
              <label className="text-xs text-muted-foreground">Fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full pl-3 text-left font-normal text-sm",
                      !editedTask?.due_date && !task.due_date && "text-muted-foreground"
                    )}
                  >
                    {editedTask?.due_date || task.due_date ? (
                      format(new Date(editedTask.due_date || task.due_date!), "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <ShadcnCalendar
                    mode="single"
                    selected={editedTask?.due_date ? new Date(editedTask.due_date) : (task.due_date ? new Date(task.due_date) : undefined)}
                    onSelect={(selectedDate) => onFieldChange('due_date', selectedDate ? selectedDate.toISOString() : null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        ) : (
          <div className="text-sm">
            {formatDate(task.start_date)}
            {task.due_date && (
              <span> → {formatDate(task.due_date)}</span>
            )}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        <div className="w-6 flex justify-center">
          <span className="text-muted-foreground">◉</span>
        </div>
        <div className="w-28">
          <div className="text-sm font-medium">Status</div>
        </div>
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <select
              value={editedTask?.status || task.status}
              onChange={(e) => onFieldChange('status', e.target.value)}
              className="border rounded-md px-2 py-1 text-sm bg-secondary text-secondary-foreground">
              {availableStatuses.map(status => (
                <option key={status} value={status}>{getStatusLabel(status)}</option>
              ))}
            </select>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-auto px-2 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity border ${getStatusClass(task.status)}`}
                  title="Clique para alterar o status"
                >
                  {getStatusLabel(task.status)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableStatuses.map((status) => (
                  <DropdownMenuItem
                    key={status}
                      onClick={() => handleQuickStatusChange(status as TaskStatus)}
                      className={task.status === status ? 'bg-muted' : ''}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusIndicatorClass(status)}`} />
                        {getStatusLabel(status)}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
          )}
        </div>
      </div>

      {/* Prioridade */}
      <div className="flex items-center gap-3">
        <div className="w-6 flex justify-center">
          <Tag className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="w-28">
          <div className="text-sm font-medium">Prioridade</div>
        </div>
        <div>
          {isEditMode && !permissions.isMember ? (
            <select
              value={editedTask?.priority || task.priority}
              onChange={(e) => onFieldChange('priority', e.target.value)}
              className="border rounded-md px-2 py-1 text-sm bg-secondary text-secondary-foreground">
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          ) : (
            <Badge variant="outline" className={`rounded-full ${getPriorityClass(task.priority)}`}>
              {priorityInfo.label}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskProperties;