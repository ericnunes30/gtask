import { useCallback, useEffect, useState } from 'react';
import { useBackendServices } from '@/hooks/useBackendServices';
import { Task } from '@/utils/commonTypes';
import { toast } from 'sonner';

export function useTaskDetails(taskId: number | null, onTaskUpdated?: () => void) {
  const [task, setTask] = useState<Task | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task> | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { tasks: tasksService, projects: projectsService } = useBackendServices();
  const { data: fetchedTask, isLoading: loading, error, refetch } = tasksService.useGetTask(taskId, { enabled: !!taskId });
  const { mutateAsync: updateTaskMutation } = tasksService.useUpdateTask();
  const { mutateAsync: deleteTaskMutation } = tasksService.useDeleteTask();

  const projectId = task?.project?.id;
  const { data: projectDetails } = projectsService.useGetProject(projectId);

  useEffect(() => {
    if (fetchedTask) {
      setTask(fetchedTask);
    }
  }, [fetchedTask]);

  useEffect(() => {
    if (projectDetails) {
      setTask(prev => prev ? { ...prev, project: { ...prev.project, ...projectDetails } } as Task : null);
    }
  }, [projectDetails]);

  const startEditMode = useCallback(() => {
    if (!task) return;
    const editData: Partial<Task> = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      start_date: task.start_date,
      due_date: task.due_date,
      users: task.users,
      occupations: task.occupations,
      has_detailed_fields: task.has_detailed_fields,
      video_url: task.video_url,
      useful_links: task.useful_links,
      observations: task.observations,
    };
    setEditedTask(editData);
    setIsEditMode(true);
  }, [task]);

  const cancelEditMode = useCallback(() => {
    setIsEditMode(false);
    setEditedTask(null);
  }, []);

  const handleFieldChange = useCallback((field: keyof Task, value: any) => {
    setEditedTask(prev => ({ ...prev, [field]: value }));
  }, []);

      const saveChanges = useCallback(async () => {
      if (!task || !editedTask || Object.keys(editedTask).length === 0) {
        setIsEditMode(false);
        return;
      }

      const dataToSend: Partial<Task> = { ...editedTask };

      // Transform users to an array of IDs
      if (dataToSend.users && Array.isArray(dataToSend.users)) {
        dataToSend.users = dataToSend.users.map(user => typeof user === 'object' ? user.id : user);
      }

      // Transform occupations to an array of IDs
      if (dataToSend.occupations && Array.isArray(dataToSend.occupations)) {
        dataToSend.occupations = dataToSend.occupations.map(occupation => typeof occupation === 'object' ? occupation.id : occupation);
      }

      const promise = updateTaskMutation({ id: task.id, data: dataToSend });

    toast.promise(promise, {
      loading: 'Salvando alterações...',
      success: (updatedTask) => {
        setTask(updatedTask);
        setIsEditMode(false);
        setEditedTask(null);
        onTaskUpdated?.();
        return 'Tarefa atualizada com sucesso!';
      },
      error: 'Erro ao atualizar a tarefa.',
    });
  }, [task, editedTask, updateTaskMutation, onTaskUpdated]);

  const deleteTask = useCallback(async () => {
    if (!taskId) return;

    const promise = deleteTaskMutation(taskId);

    toast.promise(promise, {
      loading: 'Excluindo tarefa...',
      success: () => {
        setIsDeleteDialogOpen(false);
        onTaskUpdated?.();
        return 'Tarefa excluída com sucesso!';
      },
      error: 'Erro ao excluir a tarefa.',
    });
  }, [taskId, deleteTaskMutation, onTaskUpdated]);

  const updateTask = useCallback(async (payload: { id: number, data: Partial<Task> }) => {
    if (!payload.id) return;

    const promise = updateTaskMutation(payload);

    toast.promise(promise, {
        loading: 'Atualizando tarefa...',
        success: (updatedTask) => {
            setTask(updatedTask);
            onTaskUpdated?.();
            return 'Tarefa atualizada!';
        },
        error: 'Erro ao atualizar a tarefa.',
    });

  }, [updateTaskMutation, onTaskUpdated]);

  return {
    task,
    setTask,
    loading,
    error: error ? (error as any).message : null,
    isEditMode,
    editedTask,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    startEditMode,
    cancelEditMode,
    handleFieldChange,
    saveChanges,
    deleteTask,
    updateTask,
    refetchTaskDetails: refetch,
    projectDetails,
  };
}