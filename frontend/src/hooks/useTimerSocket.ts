import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/contexts/adapters/SocketContextAdapter';
import { Task } from '@/utils/commonTypes';

export const useTimerSocket = () => {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleTimerUpdate = (data: { taskId: string; timer: number }) => {
      console.log('Received timer update:', data);
      queryClient.setQueryData(['task', parseInt(data.taskId, 10)], (oldData: Task | undefined) => {
        if (oldData) {
          return { ...oldData, timer: data.timer };
        }
        return oldData;
      });
    };

    socket.on('timer.updated', handleTimerUpdate);

    return () => {
      socket.off('timer.updated', handleTimerUpdate);
    };
  }, [socket, queryClient]);
};