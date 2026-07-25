import { useEffect } from 'react';
import { useSocket } from '@/contexts/adapters/SocketContextAdapter';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook para escutar eventos WebSocket de ocupações/equipes e
 * invalidar queries do React Query automaticamente.
 */
export function useOccupationSocket() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Entrar na room de ocupações
    socket.emit('join-occupations-room');

    const handleOccupationCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['occupations'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    };

    const handleOccupationUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['occupations'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    };

    const handleOccupationDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ['occupations'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    };

    const handleOccupationUserAdded = () => {
      queryClient.invalidateQueries({ queryKey: ['occupations'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    };

    const handleOccupationUserRemoved = () => {
      queryClient.invalidateQueries({ queryKey: ['occupations'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    };

    socket.on('occupation.created', handleOccupationCreated);
    socket.on('occupation.updated', handleOccupationUpdated);
    socket.on('occupation.deleted', handleOccupationDeleted);
    socket.on('occupation.user.added', handleOccupationUserAdded);
    socket.on('occupation.user.removed', handleOccupationUserRemoved);

    return () => {
      socket.off('occupation.created', handleOccupationCreated);
      socket.off('occupation.updated', handleOccupationUpdated);
      socket.off('occupation.deleted', handleOccupationDeleted);
      socket.off('occupation.user.added', handleOccupationUserAdded);
      socket.off('occupation.user.removed', handleOccupationUserRemoved);
      socket.emit('leave-occupations-room');
    };
  }, [socket, isConnected, queryClient]);

  return { isListening: isConnected };
}
