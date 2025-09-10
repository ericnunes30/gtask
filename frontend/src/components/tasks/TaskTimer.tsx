import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { Play, Pause } from 'lucide-react';
import { useBackendServices } from '@/hooks/useBackendServices';
import { Button } from '@/components/ui/button';

interface TaskTimerProps {
  taskId: string;
  initialTime: number;
  isRunning: boolean;
  compact?: boolean;
}

export const TaskTimer: React.FC<TaskTimerProps> = ({ taskId, initialTime, isRunning, compact }) => {
  const { socket, isConnected } = useSocket();
  const [time, setTime] = useState(initialTime);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { tasks } = useBackendServices();
  const { mutateAsync: updateTask } = tasks.useUpdateTask();

  useEffect(() => {
    setTime(initialTime);
  }, [initialTime]);

  // Fallback local increment only when not connected to WS
  useEffect(() => {
    if (isRunning && (!socket || !isConnected)) {
      intervalRef.current = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, socket, isConnected]);

  // Room membership is coordinated by KanbanBoard to avoid conflicts

  // Listen to server timer events to sync UI
  useEffect(() => {
    if (!socket) return;
    const onStarted = (p: { taskId: number; userId?: number; startTime?: string }) => {
      if (p.taskId === Number(taskId)) {
        console.log('[WS] timer.started', p);
      }
    };
    const onPaused = (p: { taskId: number; seconds: number; userId?: number }) => {
      if (p.taskId === Number(taskId)) {
        console.log('[WS] timer.paused', p);
        setTime(p.seconds);
      }
    };
    const onTick = (p: { taskId: number; seconds: number }) => {
      if (p.taskId === Number(taskId)) {
        setTime(p.seconds);
      }
    };
    socket.on('timer.started', onStarted);
    socket.on('timer.paused', onPaused);
    socket.on('timer.tick', onTick);
    return () => {
      socket.off('timer.started', onStarted);
      socket.off('timer.paused', onPaused);
      socket.off('timer.tick', onTick);
    };
  }, [socket, taskId]);

  const handlePlay = () => {
    console.log(`Starting timer for task ${taskId}`);
    if (socket) {
      socket.emit('timer.start', { taskId: Number(taskId) });
    }
    // Move status para Em Andamento ao iniciar pelo widget
    updateTask({ id: Number(taskId), data: { status: 'em_andamento' } }).catch(() => {});
  };

  const handlePause = () => {
    console.log(`Pausing timer for task ${taskId} at ${time} seconds`);
    if (socket) {
      socket.emit('timer.pause', { taskId: Number(taskId), seconds: time });
    }
    // Ao pausar pelo widget, mover para A Fazer
    updateTask({ id: Number(taskId), data: { status: 'a_fazer' } }).catch(() => {});
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  if (compact) {
    return <span>{formatTime(time)}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span>{formatTime(time)}</span>
      {isRunning ? (
        <Button variant="ghost" size="icon" onClick={handlePause}>
          <Pause className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant="ghost" size="icon" onClick={handlePlay}>
          <Play className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
