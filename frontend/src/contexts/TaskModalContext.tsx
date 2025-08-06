import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { Task, Comment as ApiComment, User as ApiUser } from '@/common/types';
import { TaskModalContextType, TaskModalState, TimerState, TaskHistoryItem } from '@/types/modal';
import { useBackendServices } from '@/hooks/useBackendServices';
import { transformApiTaskToFrontend } from '@/utils/apiTransformers';
import { toast } from 'sonner';

// Actions types
type TaskModalAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TASK'; payload: Task | null }
  | { type: 'SET_COMMENTS'; payload: ApiComment[] }
  | { type: 'SET_COMMENTS_LOADING'; payload: boolean }
  | { type: 'SET_UPDATING'; payload: boolean }
  | { type: 'ADD_COMMENT'; payload: ApiComment }
  | { type: 'DELETE_COMMENT'; payload: number }
  | { type: 'LIKE_COMMENT'; payload: { commentId: number; liked: boolean } }
  | { type: 'OPEN_MODAL'; payload: { taskId: number } }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SET_TIMER_RUNNING'; payload: string | null }
  | { type: 'SET_TIMER_VALUE'; payload: { taskId: string; value: number } }
  | { type: 'UPDATE_TIMER_VALUES'; payload: Record<string, number> };

// Initial state
const initialState: TaskModalState = {
  isOpen: false,
  isLoading: false,
  task: null,
  comments: [],
  isCommentsLoading: false,
  isUpdating: false,
};

const initialTimerState: TimerState = {
  runningTaskId: null,
  currentValues: {},
};

// Reducer
function taskModalReducer(state: TaskModalState, action: TaskModalAction): TaskModalState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_TASK':
      return { ...state, task: action.payload };
    case 'SET_COMMENTS':
      return { ...state, comments: action.payload };
    case 'SET_COMMENTS_LOADING':
      return { ...state, isCommentsLoading: action.payload };
    case 'SET_UPDATING':
      return { ...state, isUpdating: action.payload };
    case 'ADD_COMMENT':
      return { ...state, comments: [action.payload, ...state.comments] };
    case 'DELETE_COMMENT':
      return { 
        ...state, 
        comments: state.comments.filter(comment => comment.id !== action.payload) 
      };
    case 'LIKE_COMMENT':
      return {
        ...state,
        comments: state.comments.map(comment =>
          comment.id === action.payload.commentId
            ? { ...comment, liked: action.payload.liked }
            : comment
        )
      };
    case 'OPEN_MODAL':
      return { ...state, isOpen: true, isLoading: true };
    case 'CLOSE_MODAL':
      return { ...initialState };
    default:
      return state;
  }
}

function timerReducer(state: TimerState, action: TaskModalAction): TimerState {
  switch (action.type) {
    case 'SET_TIMER_RUNNING':
      return { ...state, runningTaskId: action.payload };
    case 'SET_TIMER_VALUE':
      return {
        ...state,
        currentValues: {
          ...state.currentValues,
          [action.payload.taskId]: action.payload.value
        }
      };
    case 'UPDATE_TIMER_VALUES':
      return { ...state, currentValues: action.payload };
    default:
      return state;
  }
}

// Context
const TaskModalContext = createContext<TaskModalContextType | undefined>(undefined);

// Provider props
interface TaskModalProviderProps {
  children: React.ReactNode;
}

// Provider component
export const TaskModalProvider: React.FC<TaskModalProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(taskModalReducer, initialState);
  const [timerState, timerDispatch] = useReducer(timerReducer, initialTimerState);
  const { getTaskById, updateTask, addTaskComment, deleteTaskComment } = useBackendServices();

  // Open modal and fetch task data
  const openModal = useCallback(async (taskId: number) => {
    dispatch({ type: 'OPEN_MODAL', payload: { taskId } });

    try {
      const taskData = await getTaskById(taskId);
      const transformedTask = transformApiTaskToFrontend(taskData);
      
      dispatch({ type: 'SET_TASK', payload: transformedTask });
      dispatch({ type: 'SET_COMMENTS', payload: taskData.comments || [] });
    } catch (error) {
      console.error('Erro ao carregar tarefa:', error);
      toast.error('Erro ao carregar detalhes da tarefa');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [getTaskById]);

  // Close modal
  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' });
  }, []);

  // Update task
  const updateTaskData = useCallback(async (updates: Partial<Task>) => {
    if (!state.task) return;

    dispatch({ type: 'SET_UPDATING', payload: true });

    try {
      const updatedTask = await updateTask({ 
        id: state.task.id, 
        data: updates 
      });
      
      const transformedTask = transformApiTaskToFrontend(updatedTask);
      dispatch({ type: 'SET_TASK', payload: transformedTask });
      
      toast.success('Tarefa atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa');
      throw error;
    } finally {
      dispatch({ type: 'SET_UPDATING', payload: false });
    }
  }, [state.task, updateTask]);

  // Add comment
  const addComment = useCallback(async (content: string) => {
    if (!state.task) return;

    try {
      const newComment = await addTaskComment(state.task.id, { content });
      dispatch({ type: 'ADD_COMMENT', payload: newComment });
      toast.success('Comentário adicionado com sucesso');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast.error('Erro ao adicionar comentário');
      throw error;
    }
  }, [state.task, addTaskComment]);

  // Delete comment
  const deleteComment = useCallback(async (commentId: number) => {
    try {
      await deleteTaskComment(commentId);
      dispatch({ type: 'DELETE_COMMENT', payload: commentId });
      toast.success('Comentário removido com sucesso');
    } catch (error) {
      console.error('Erro ao remover comentário:', error);
      toast.error('Erro ao remover comentário');
      throw error;
    }
  }, [deleteTaskComment]);

  // Like comment
  const likeComment = useCallback(async (commentId: number) => {
    try {
      // TODO: Implementar endpoint de like
      // await likeTaskComment(commentId);
      dispatch({ type: 'LIKE_COMMENT', payload: { commentId, liked: true } });
      toast.success('Comentário curtido');
    } catch (error) {
      console.error('Erro ao curtir comentário:', error);
      toast.error('Erro ao curtir comentário');
      throw error;
    }
  }, []);

  // Timer actions
  const startTimer = useCallback((taskId: string) => {
    timerDispatch({ type: 'SET_TIMER_RUNNING', payload: taskId });
  }, []);

  const stopTimer = useCallback(() => {
    timerDispatch({ type: 'SET_TIMER_RUNNING', payload: null });
  }, []);

  const updateTimerValue = useCallback((taskId: string, value: number) => {
    timerDispatch({ type: 'SET_TIMER_VALUE', payload: { taskId, value } });
  }, []);

  // Context value
  const contextValue: TaskModalContextType = {
    state,
    timerState,
    openModal,
    closeModal,
    updateTask: updateTaskData,
    addComment,
    deleteComment,
    likeComment,
    startTimer,
    stopTimer,
    updateTimerValue,
  };

  return (
    <TaskModalContext.Provider value={contextValue}>
      {children}
    </TaskModalContext.Provider>
  );
};

// Hook to use context
export const useTaskModal = (): TaskModalContextType => {
  const context = useContext(TaskModalContext);
  if (context === undefined) {
    throw new Error('useTaskModal must be used within a TaskModalProvider');
  }
  return context;
};