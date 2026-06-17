import React from 'react';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  Briefcase,
  Copy,
  Edit,
  Trash2,
} from 'lucide-react';
import { Task, TaskStatus } from '@/utils/commonTypes';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';

interface TaskDetailsHeaderProps {
  task: Task;
  isEditMode: boolean;
  editedTask: Partial<Task>;
  isDeleteDialogOpen: boolean;
  onFieldChange: (field: keyof Task, value: any) => void;
  onToggleComplete: () => void;
  onDuplicateTask?: (task: Task) => void;
  onSaveChanges: () => void;
  onCancelEditMode: () => void;
  onStartEditMode: () => void;
  onDeleteTask: () => void;
  setIsDeleteDialogOpen: (isOpen: boolean) => void;
  onTaskUpdated: () => void;
  updateTask: (data: { id: number; data: Partial<Task> }) => Promise<any>;
  setTask: (task: Task | null) => void;
}

const TaskDetailsHeader: React.FC<TaskDetailsHeaderProps> = ({
  task,
  isEditMode,
  editedTask,
  isDeleteDialogOpen,
  onFieldChange,
  onDuplicateTask,
  onSaveChanges,
  onCancelEditMode,
  onStartEditMode,
  onDeleteTask,
  setIsDeleteDialogOpen,
  onTaskUpdated,
  updateTask,
  setTask,
}) => {
  const permissions = usePermissions();

  const handleToggleComplete = async () => {
    if (!task) return;

    try {
      const newStatus = task.status === 'concluido' ? 'a_fazer' : 'concluido';
      const taskData: { status: TaskStatus } = { status: newStatus as TaskStatus };
      const updatedTask = await updateTask({ id: task.id, data: taskData });

      setTask({ ...task, ...updatedTask });
      toast.success(
        newStatus === 'concluido'
          ? 'Tarefa marcada como concluída!'
          : 'Tarefa marcada como pendente!'
      );
      onTaskUpdated();
    } catch (err) {
      toast.error('Erro ao atualizar status da tarefa. Tente novamente.');
    }
  };

  return (
    <>
      <DialogHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Checkbox
                id="task-complete"
                checked={task.status === 'concluido'}
                onCheckedChange={handleToggleComplete}
              />
              {isEditMode ? (
                <Input
                  value={editedTask.title || ''}
                  onChange={(e) => onFieldChange('title', e.target.value)}
                  className="font-semibold text-lg"
                />
              ) : (
                <DialogTitle className={task.status === 'concluido' ? "line-through text-muted-foreground" : ""}>
                  {task.title}
                </DialogTitle>
              )}

              <div className="flex gap-1 ml-auto">
                {isEditMode ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={onCancelEditMode}>
                      Cancelar
                    </Button>
                    <Button variant="default" size="sm" className="h-8 px-2" onClick={onSaveChanges}>
                      Salvar
                    </Button>
                  </div>
                ) : (
                  <>
                    {onDuplicateTask && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => onDuplicateTask(task)}
                        title="Duplicar tarefa"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}

                    {!permissions.isMember ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={onStartEditMode}
                        title="Editar tarefa"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            title="Alterar status"
                          >
                            <span className="text-muted-foreground">◉</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {/* Add status options here */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </>
                )}

                {!permissions.isMember && (
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setIsDeleteDialogOpen(true)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogHeader>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center bg-destructive/10 p-3 rounded-md mt-2">
            <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
            <p className="text-sm">Todos os dados relacionados a esta tarefa serão perdidos.</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center gap-2 mt-2">
        <Briefcase className="h-4 w-4 text-muted-foreground" />
        <DialogDescription className="m-0">
          {task.project ? task.project.title : 'Sem projeto associado'}
        </DialogDescription>
      </div>
    </>
  );
};

export default TaskDetailsHeader;