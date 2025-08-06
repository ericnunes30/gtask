import React, { useState, useEffect } from 'react';
import { BaseModal } from '@/components/common/BaseModal';
import { TaskDetails } from './TaskDetails';
import { TaskComments } from './TaskComments';
import { useBackendServices } from '@/hooks/useBackendServices';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Task, User as ApiUser } from '@/common/types';
import { TaskHistoryItem } from '@/types/modal';
import { transformApiTaskToFrontend } from '@/utils/apiTransformers';
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
  const { user: authUser } = useAuth();
  const { canEditTask, canDeleteTask } = usePermissions();
  
  const { 
    getTaskById, 
    getUsers, 
    getOccupations, 
    getTaskHistory,
    updateTask: updateTaskService,
    addTaskComment 
  } = useBackendServices();

  // Local state
  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [occupations, setOccupations] = useState<any[]>([]);
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch task details
  const fetchTaskDetails = async (id: number) => {
    setIsLoading(true);
    try {
      const [taskData, usersData, occupationsData] = await Promise.all([
        getTaskById(id),
        getUsers(),
        getOccupations()
      ]);

      const transformedTask = transformApiTaskToFrontend(taskData);
      setTask(transformedTask);
      setUsers(usersData);
      setOccupations(occupationsData);

      // Fetch task history
      try {
        const historyData = await getTaskHistory(id);
        setHistory(historyData);
      } catch (error) {
        console.warn('Erro ao carregar histórico:', error);
        setHistory([]);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes da tarefa:', error);
      toast.error('Erro ao carregar detalhes da tarefa');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to fetch task when modal opens
  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails(taskId);
    } else {
      // Reset state when modal closes
      setTask(null);
      setUsers([]);
      setOccupations([]);
      setHistory([]);
    }
  }, [isOpen, taskId]);

  // Handle task update
  const handleTaskUpdate = async (updates: Partial<Task>) => {
    if (!task) return;

    try {
      const updatedTask = await updateTaskService({ 
        id: task.id, 
        data: updates 
      });
      
      const transformedTask = transformApiTaskToFrontend(updatedTask);
      setTask(transformedTask);
      onTaskUpdated?.();
      toast.success('Tarefa atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa');
      throw error;
    }
  };

  // Handle comment addition
  const handleAddComment = async (content: string) => {
    if (!task) return;

    try {
      await addTaskComment(task.id, { content });
      // Refresh task to get updated comments
      await fetchTaskDetails(task.id);
      toast.success('Comentário adicionado com sucesso');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast.error('Erro ao adicionar comentário');
      throw error;
    }
  };

  // Handle task duplication
  const handleDuplicate = (taskToDuplicate: Task) => {
    if (onDuplicateTask) {
      onDuplicateTask(taskToDuplicate);
      onClose();
    }
  };

  // Handle timer updates
  const handleTimerUpdate = (newValue: number) => {
    if (!task || !setCurrentTimerValues || !currentTimerValues) return;

    const updatedValues = {
      ...currentTimerValues,
      [task.id.toString()]: newValue
    };
    
    setCurrentTimerValues(updatedValues);

    // Update task timer
    handleTaskUpdate({ timer: newValue });
  };

  // Handle timer status change
  const handleTimerStatusChange = (status: string) => {
    if (!task || !setTimerRunningTaskId) return;

    if (status === 'Em Andamento') {
      setTimerRunningTaskId(task.id.toString());
    } else {
      setTimerRunningTaskId(null);
    }

    // Update task status
    handleTaskUpdate({ status: status as any });
  };

  // Check permissions
  const canEdit = task ? canEditTask(task) : false;
  const canDelete = task ? canDeleteTask(task) : false;

  if (!task && isLoading) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        size="xl"
        title="Carregando..."
      >
        <div className="flex items-center justify-center py-12">
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
      size="full"
      className="max-w-[95vw] max-h-[90vh]"
    >
      <div className="flex h-full min-h-[600px]">
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
          canEdit={canEdit}
          canDelete={canDelete}
        />

        <TaskComments
          taskId={task.id}
          comments={task.comments || []}
          history={history}
          users={users}
          onAddComment={handleAddComment}
          onRefetch={() => fetchTaskDetails(task.id)}
          isSubmitting={isLoading}
        />
      </div>
    </BaseModal>
  );
};