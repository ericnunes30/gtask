import { useEffect } from 'react';
import { useSocket } from '@/contexts/adapters/SocketContextAdapter';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook para escutar eventos WebSocket de tarefas recorrentes e
 * invalidar queries do React Query automaticamente.
 */
export function useRecurringTaskSocket() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Entrar na room de tarefas recorrentes
    socket.emit('join-recurring-tasks-room');

    const handleRecurringTaskCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['recurringTasks'] });
    };

    const handleRecurringTaskUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['recurringTasks'] });
    };

    const handleRecurringTaskDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ['recurringTasks'] });
    };

    socket.on('recurring-task.created', handleRecurringTaskCreated);
    socket.on('recurring-task.updated', handleRecurringTaskUpdated);
    socket.on('recurring-task.deleted', handleRecurringTaskDeleted);

    return () => {
      socket.off('recurring-task.created', handleRecurringTaskCreated);
      socket.off('recurring-task.updated', handleRecurringTaskUpdated);
      socket.off('recurring-task.deleted', handleRecurringTaskDeleted);
      socket.emit('leave-recurring-tasks-room');
    };
  }, [socket, isConnected, queryClient]);

  return { isListening: isConnected };
}
