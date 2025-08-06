import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  Copy, 
  Edit, 
  Trash2, 
  AlertCircle, 
  AlertTriangle 
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '@/common/types';
import { cn } from '@/utils/utils';

interface TaskHeaderProps {
  task: Task;
  isEditMode: boolean;
  editedTask: Partial<Task>;
  onToggleEdit: () => void;
  onFieldChange: (field: string, value: any) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'Backlog', label: 'Backlog', color: 'bg-gray-100 text-gray-800' },
  { value: 'To Do', label: 'To Do', color: 'bg-blue-100 text-blue-800' },
  { value: 'Em Andamento', label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Pausado', label: 'Pausado', color: 'bg-orange-100 text-orange-800' },
  { value: 'Em Revisão', label: 'Em Revisão', color: 'bg-purple-100 text-purple-800' },
  { value: 'Concluído', label: 'Concluído', color: 'bg-green-100 text-green-800' }
];

const priorityOptions: { value: TaskPriority; label: string; color: string; icon: React.ReactNode }[] = [
  { 
    value: 'low', 
    label: 'Baixa', 
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: null
  },
  { 
    value: 'medium', 
    label: 'Média', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: null
  },
  { 
    value: 'high', 
    label: 'Alta', 
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: <AlertCircle className="h-3 w-3" />
  },
  { 
    value: 'urgent', 
    label: 'Urgente', 
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <AlertTriangle className="h-3 w-3" />
  }
];

export const TaskHeader: React.FC<TaskHeaderProps> = ({
  task,
  isEditMode,
  editedTask,
  onToggleEdit,
  onFieldChange,
  onDuplicate,
  onDelete,
  canEdit = true,
  canDelete = true
}) => {
  const getCurrentStatus = () => {
    const status = editedTask.status || task.status;
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  const getCurrentPriority = () => {
    const priority = editedTask.priority || task.priority;
    return priorityOptions.find(p => p.value === priority) || priorityOptions[0];
  };

  return (
    <div className="p-6 border-b">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          {isEditMode ? (
            <Input
              value={editedTask.title || task.title}
              onChange={(e) => onFieldChange('title', e.target.value)}
              className="text-xl font-semibold border-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Título da tarefa"
            />
          ) : (
            <h2 className="text-xl font-semibold text-foreground break-words">
              {task.title}
            </h2>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleEdit}
            >
              <Edit className="h-4 w-4 mr-2" />
              {isEditMode ? 'Cancelar' : 'Editar'}
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onDuplicate && (
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar tarefa
                </DropdownMenuItem>
              )}
              {onDelete && canDelete && (
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir tarefa
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-3">
        {/* Status e Prioridade */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            {isEditMode ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Badge className={cn('mr-2', getCurrentStatus().color)}>
                      {getCurrentStatus().label}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {statusOptions.map((status) => (
                    <DropdownMenuItem
                      key={status.value}
                      onClick={() => onFieldChange('status', status.value)}
                    >
                      <Badge className={cn('mr-2', status.color)}>
                        {status.label}
                      </Badge>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Badge className={getCurrentStatus().color}>
                {getCurrentStatus().label}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Prioridade:</span>
            {isEditMode ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Badge className={cn('mr-2', getCurrentPriority().color)}>
                      {getCurrentPriority().icon}
                      <span className="ml-1">{getCurrentPriority().label}</span>
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {priorityOptions.map((priority) => (
                    <DropdownMenuItem
                      key={priority.value}
                      onClick={() => onFieldChange('priority', priority.value)}
                    >
                      <Badge className={cn('mr-2', priority.color)}>
                        {priority.icon}
                        <span className="ml-1">{priority.label}</span>
                      </Badge>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Badge className={getCurrentPriority().color}>
                {getCurrentPriority().icon}
                <span className="ml-1">{getCurrentPriority().label}</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Descrição */}
        <div>
          <span className="text-sm font-medium mb-2 block">Descrição:</span>
          {isEditMode ? (
            <Textarea
              value={editedTask.description || task.description || ''}
              onChange={(e) => onFieldChange('description', e.target.value)}
              placeholder="Adicione uma descrição para esta tarefa..."
              className="min-h-[80px]"
            />
          ) : (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {task.description || 'Nenhuma descrição fornecida.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};