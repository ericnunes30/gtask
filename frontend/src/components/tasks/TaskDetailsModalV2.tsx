import React, { useEffect, useState } from 'react';
import { BaseModal } from '@/components/common/BaseModal';
import { TaskDetails } from './TaskDetails';
import { TaskComments } from './TaskComments';
import { Task, User as ApiUser } from '@/common/types';
import { useBackendServices } from '@/hooks/useBackendServices';
import { useTaskModalContext } from '@/contexts/TaskModalContext';
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
  const [occupations, setOccupations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { tasks, users: usersService } = useBackendServices();
  const { data: taskData } = tasks.useGetTask(taskId || 0, { enabled: !!taskId && isOpen });
  const { data: usersData } = usersService.useGetUsers({ enabled: isOpen });
  const { mutateAsync: updateTask } = tasks.useUpdateTask();

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

  const handleTaskUpdate = async (updates: Partial<Task>) => {
    if (!task) return;

    try {
      setIsLoading(true);
      await updateTask({ id: task.id, data: updates });
      
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

  if (!task) {
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
        />
      </div>
    </BaseModal>
  );
};