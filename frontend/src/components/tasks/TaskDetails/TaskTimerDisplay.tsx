import React from 'react';
import { Task, TaskStatus } from '@/utils/commonTypes';
import { Clock } from 'lucide-react';
import { TaskTimer } from '@/components/tasks/TaskTimer';
import { useBackendServices } from '@/hooks/useBackendServices';
import { toast } from 'sonner';

interface TaskTimerDisplayProps {
  task: Task;
  onTaskUpdated: () => void;
  timerRunningTaskId?: string | null;
  setTimerRunningTaskId?: (taskId: string | null) => void;
  currentTimerValues?: Record<string, number>;
  setCurrentTimerValues?: (values: Record<string, number>) => void;
}

const TaskTimerDisplay: React.FC<TaskTimerDisplayProps> = ({
  task,
  onTaskUpdated,
  timerRunningTaskId,
  setTimerRunningTaskId,
  currentTimerValues,
}) => {
  const { tasks: tasksService } = useBackendServices();
  const { mutateAsync: updateTask } = tasksService.useUpdateTask();

  if (!task) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="w-6 flex justify-center">
        <Clock className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="w-28">
        <div className="text-sm font-medium">Temporizador</div>
      </div>
      <div className="text-sm">
        <TaskTimer
          key={`timer-${task.id}`}
          taskId={String(task.id)}
          initialTime={
            (currentTimerValues && currentTimerValues[String(task.id)]) || task.timer || 0
          }
          isRunning={timerRunningTaskId === String(task.id)}
          compact={false}
        />
      </div>
    </div>
  );
};

export default TaskTimerDisplay;