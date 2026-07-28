import { useEffect } from 'react';
import { useSocket } from '@/contexts/adapters/SocketContextAdapter';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook para escutar eventos WebSocket de projetos e
 * invalidar queries do React Query automaticamente.
 */
export function useProjectSocket() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Entrar na room de projetos
    socket.emit('join-projects-room');

    const handleProjectCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    };

    const handleProjectUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    };

    const handleProjectDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    };

    socket.on('project.created', handleProjectCreated);
    socket.on('project.updated', handleProjectUpdated);
    socket.on('project.deleted', handleProjectDeleted);

    return () => {
      socket.off('project.created', handleProjectCreated);
      socket.off('project.updated', handleProjectUpdated);
      socket.off('project.deleted', handleProjectDeleted);
      socket.emit('leave-projects-room');
    };
  }, [socket, isConnected, queryClient]);

  return { isListening: isConnected };
}
