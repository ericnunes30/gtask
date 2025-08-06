import React, { lazy, Suspense } from 'react';
import { ModalSkeleton } from '@/components/common/ModalSkeleton';
import { Task } from '@/common/types';

// Lazy load do modal refatorado
const TaskDetailsModalV2 = lazy(() => 
  import('./TaskDetailsModalV2').then(module => ({
    default: module.TaskDetailsModalV2
  }))
);

interface LazyTaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number | null;
  onTaskUpdated?: () => void;
  timerRunningTaskId?: string;
  currentTimerValues?: Record<string, number>;
  setCurrentTimerValues?: (values: Record<string, number>) => void;
  setTimerRunningTaskId?: (taskId: string | null) => void;
  onDuplicateTask?: (task: Task) => void;
}

export const LazyTaskDetailsModal: React.FC<LazyTaskDetailsModalProps> = (props) => {
  // Se o modal não estiver aberto, não renderizar nada para economizar recursos
  if (!props.isOpen) {
    return null;
  }

  return (
    <Suspense 
      fallback={
        <ModalSkeleton 
          isOpen={props.isOpen} 
          onClose={props.onClose} 
        />
      }
    >
      <TaskDetailsModalV2 {...props} />
    </Suspense>
  );
};