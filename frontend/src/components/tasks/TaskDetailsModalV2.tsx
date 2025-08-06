import React, { useEffect, useState } from 'react';
import { BaseModal } from '@/components/common/BaseModal';
import { TaskDetails } from '@/components/tasks/TaskDetails';
import { TaskComments } from '@/components/tasks/TaskComments';
import { Task, User as ApiUser, Team } from '@/common/types';
import { useBackendServices } from '@/hooks/useBackendServices';
import { toast } from 'sonner';

interface TaskDetailsModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  taskId: number | null;
  onTaskUpdated?: () => void;
  timerRunningTaskId?: string;
  currentTimerValues?: Record<string, number>;
  setCurrentTimerValues?: (values: Record<string, number>) => void;
  setTimerRunningTaskId?: (taskId: string | null) => void;
  onDuplicateTask?: (task: Task) => void;
}

export const TaskDetailsModalV2: React.FC<TaskDetailsModalV2Props> = ({
  isOpen,
  onClose,
  taskId,
  onTaskUpdated,
  timerRunningTaskId,
  currentTimerValues,
  setCurrentTimerValues,
  setTimerRunningTaskId,
  onDuplicateTask
}) => {
  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [occupations, setOccupations] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { tasks, users: usersService, comments, teams } = useBackendServices();

  // Only fetch task-specific data when a taskId is available and the modal is open.
  const isTaskQueryEnabled = !!taskId && isOpen;

  const { data: taskData } = tasks.useGetTask(taskId!, { enabled: isTaskQueryEnabled });
  const { data: usersData } = usersService.useGetUsers({ enabled: isOpen });
  const { data: occupationsData } = teams.useGetTeams({ enabled: isOpen });
  const { data: commentsData, refetch: refetchComments } = comments.useGetCommentsByTask(taskId!, { enabled: isTaskQueryEnabled });
  const { mutateAsync: updateTask } = tasks.useUpdateTask();
  const { mutateAsync: addComment } = comments.useCreateComment();

  useEffect(() => {
    if (taskData) {
      setTask(taskData);
    }
  }, [taskData]);

  useEffect(() => {
    if (usersData) {
      setUsers(usersData);
    }
  }, [usersData]);

  useEffect(() => {
    if (occupationsData) {
      setOccupations(occupationsData);
    }
  }, [occupationsData]);

  const handleTaskUpdate = async (updates: Partial<Task>) => {
    if (!task) return;

    try {
      setIsLoading(true);
      await updateTask({ id: task.id, data: updates as any });
      
      // Atualizar o estado local
      setTask(prev => prev ? { ...prev, ...updates } : null);
      
      // Notificar o componente pai
      if (onTaskUpdated) {
        await onTaskUpdated();
      }
      
      toast.success('Tarefa atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = (task: Task) => {
    if (onDuplicateTask) {
      onDuplicateTask(task);
    }
    onClose();
  };

  const handleTimerUpdate = (newValue: number) => {
    if (task && setCurrentTimerValues) {
      setCurrentTimerValues({
        ...currentTimerValues,
        [task.id]: newValue
      });
    }
  };

  const handleTimerStatusChange = (status: string) => {
    if (!task) return;

    if (status === 'Em Andamento') {
      setTimerRunningTaskId?.(String(task.id));
    } else {
      setTimerRunningTaskId?.(null);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!task) return;
    
    try {
      await addComment({
        task_id: task.id,
        content
      });
      await refetchComments();
      toast.success('Comentário adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast.error('Erro ao adicionar comentário');
      throw error;
    }
  };

  if (!task && taskId) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Carregando..."
        size="xl"
      >
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </BaseModal>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      description={`Tarefa #${task.id}`}
      size="xl"
    >
      <div className="flex gap-4 h-[600px]">
        <TaskDetails
          task={task}
          users={users}
          occupations={occupations}
          onTaskUpdate={handleTaskUpdate}
          onDuplicate={handleDuplicate}
          timerRunningTaskId={timerRunningTaskId}
          currentTimerValues={currentTimerValues}
          onTimerUpdate={handleTimerUpdate}
          onTimerStatusChange={handleTimerStatusChange}
        />
        
        <TaskComments
          taskId={task.id}
          comments={commentsData || []}
          history={[]} // TODO: Implement task history
          users={users}
          onAddComment={handleAddComment}
          onRefetch={() => {
            refetchComments().catch((error) => {
              console.error('Erro ao recarregar comentários:', error);
            });
          }}
          isSubmitting={isLoading}
        />
      </div>
    </BaseModal>
  );
};