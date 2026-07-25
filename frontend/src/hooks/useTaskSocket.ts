import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/contexts/adapters/SocketContextAdapter';

export const useTaskSocket = (projectId?: number) => {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join appropriate rooms
    if (projectId !== undefined) {
      socket.emit('join-project-room', String(projectId));
    } else {
      socket.emit('join-tasks-room');
    }

    const handleTaskCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    };

    const handleTaskUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    };

    const handleTaskStatusChanged = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    };

    const handleTaskAssigneesUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    };

    const handleCommentCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    const handleCommentUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    };

    const handleCommentDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    };

    socket.on('task.created', handleTaskCreated);
    socket.on('task.updated', handleTaskUpdated);
    socket.on('task.status.changed', handleTaskStatusChanged);
    socket.on('task.assignees.updated', handleTaskAssigneesUpdated);
    socket.on('comment.created', handleCommentCreated);
    socket.on('comment.updated', handleCommentUpdated);
    socket.on('comment.deleted', handleCommentDeleted);

    return () => {
      socket.off('task.created', handleTaskCreated);
      socket.off('task.updated', handleTaskUpdated);
      socket.off('task.status.changed', handleTaskStatusChanged);
      socket.off('task.assignees.updated', handleTaskAssigneesUpdated);
      socket.off('comment.created', handleCommentCreated);
      socket.off('comment.updated', handleCommentUpdated);
      socket.off('comment.deleted', handleCommentDeleted);

      if (projectId !== undefined) {
        socket.emit('leave-project-room', String(projectId));
      } else {
        socket.emit('leave-tasks-room');
      }
    };
  }, [socket, isConnected, projectId, queryClient]);
};
