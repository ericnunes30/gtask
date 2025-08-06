import { Task, Comment as ApiComment } from '@/common/types';

// Base modal types
export interface ModalState {
  isOpen: boolean;
  isLoading: boolean;
}

// Task modal specific types
export interface TaskModalState extends ModalState {
  task: Task | null;
  comments: ApiComment[];
  isCommentsLoading: boolean;
  isUpdating: boolean;
}

// Timer state
export interface TimerState {
  runningTaskId: string | null;
  currentValues: Record<string, number>;
}

// Task history types
export interface TaskHistoryItem {
  id: number;
  task_id: number;
  user_id: number;
  action: string;
  field?: string;
  old_value?: string;
  new_value?: string;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
}

// Activity types
export type ActivityItem = (ApiComment | TaskHistoryItem) & { 
  type: 'comment' | 'history' 
};

// Context types
export interface TaskModalContextType {
  // State
  state: TaskModalState;
  timerState: TimerState;
  
  // Actions
  openModal: (taskId: number) => void;
  closeModal: () => void;
  updateTask: (updates: Partial<Task>) => Promise<void>;
  addComment: (content: string) => Promise<void>;
  deleteComment: (commentId: number) => Promise<void>;
  likeComment: (commentId: number) => Promise<void>;
  
  // Timer actions
  startTimer: (taskId: string) => void;
  stopTimer: () => void;
  updateTimerValue: (taskId: string, value: number) => void;
}

// Props interfaces
export interface TaskModalProps {
  taskId: number | null;
  onTaskUpdated?: () => void;
  onDuplicateTask?: (task: Task) => void;
}