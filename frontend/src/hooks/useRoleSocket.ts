import { useEffect } from 'react';
import { useSocket } from '@/contexts/adapters/SocketContextAdapter';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook para escutar eventos WebSocket de roles/cargos e
 * invalidar queries do React Query automaticamente.
 */
export function useRoleSocket() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Entrar na room de roles
    socket.emit('join-roles-room');

    const handleRoleCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    };

    const handleRoleUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    };

    const handleRoleDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    };

    socket.on('role.created', handleRoleCreated);
    socket.on('role.updated', handleRoleUpdated);
    socket.on('role.deleted', handleRoleDeleted);

    return () => {
      socket.off('role.created', handleRoleCreated);
      socket.off('role.updated', handleRoleUpdated);
      socket.off('role.deleted', handleRoleDeleted);
      socket.emit('leave-roles-room');
    };
  }, [socket, isConnected, queryClient]);

  return { isListening: isConnected };
}
