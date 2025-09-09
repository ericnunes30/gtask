import React, { useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSocket } from '@/contexts/SocketContext';
import { toast } from "sonner";

interface TaskTimerProps {
  taskId: string;
  initialTime: number;
  isRunning: boolean;
  compact?: boolean;
}

export const TaskTimer: React.FC<TaskTimerProps> = ({
  taskId,
  initialTime,
  isRunning,
  compact = true,
}) => {
  const { socket, isConnected } = useSocket();
  const [time, setTime] = useState(initialTime);

  // Efeito para ouvir os ticks do WebSocket
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleTimerTick = (data: { taskId: number; seconds: number }) => {
      // Só atualiza o tempo se o tick for para esta tarefa específica
      if (String(data.taskId) === taskId) {
        setTime(data.seconds);
      }
    };

    socket.on('timer.tick', handleTimerTick);

    return () => {
      socket.off('timer.tick', handleTimerTick);
    };
  }, [socket, isConnected, taskId]);

  // Efeito para resetar o tempo se o initialTime mudar (ex: ao pausar ou recarregar dados)
  useEffect(() => {
    setTime(initialTime);
  }, [initialTime]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!socket || !isConnected) {
      toast.error("Não foi possível conectar ao servidor de tempo real.");
      return;
    }

    const taskIdNum = parseInt(taskId, 10);
    if (isRunning) {
      socket.emit('timer.pause', { taskId: taskIdNum });
    } else {
      socket.emit('timer.start', { taskId: taskIdNum });
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimerColorClass = () => {
    if (isRunning) return "text-green-600";
    if (time > 0) return "text-amber-600";
    return "text-muted-foreground";
  };

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <span className={`font-mono text-xs font-medium ${getTimerColorClass()}`}>{formatTime(time)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tempo de trabalho: {formatTime(time)}</p>
            </TooltipContent>
          </Tooltip>
          <div className="flex items-center ml-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-4 w-4 p-0 opacity-70 hover:opacity-100 ${isRunning ? 'text-green-600' : ''}`}
                  onClick={handleToggle}
                  type="button"
                >
                  {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRunning ? 'Pausar' : 'Iniciar'} temporizador</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center">
        <span className={`font-mono text-sm ${getTimerColorClass()}`}>{formatTime(time)}</span>
        <div className="flex items-center ml-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`h-8 w-8 ${isRunning ? 'bg-green-100 border-green-300' : ''}`}
                onClick={handleToggle}
                type="button"
              >
                {isRunning ? <Pause className="h-4 w-4 text-green-600" /> : <Play className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isRunning ? 'Pausar' : 'Iniciar'} temporizador</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};
