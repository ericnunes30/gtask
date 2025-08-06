import React, { useState } from 'react';
import { Task, User as ApiUser } from '@/common/types';
import { TaskHeader } from './TaskHeader';
import { TaskDetailsForm } from './TaskDetailsForm';
import { Button } from '@/components/ui/button';

interface TaskDetailsProps {
  task: Task;
  users: ApiUser[];
  occupations: any[];
  onTaskUpdate: (updates: Partial<Task>) => Promise<void>;
  onDuplicate?: (task: Task) => void;
  onDelete?: () => void;
  timerRunningTaskId?: string;
  currentTimerValues?: Record<string, number>;
  onTimerUpdate?: (newValue: number) => void;
  onTimerStatusChange?: (status: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const TaskDetails: React.FC<TaskDetailsProps> = ({
  task,
  users,
  occupations,
  onTaskUpdate,
  onDuplicate,
  onDelete,
  timerRunningTaskId,
  currentTimerValues,
  onTimerUpdate,
  onTimerStatusChange,
  canEdit = true,
  canDelete = true
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});

  const handleToggleEdit = () => {
    if (isEditMode) {
      // Cancelar edição
      setEditedTask({});
      setIsEditMode(false);
    } else {
      // Iniciar edição
      setIsEditMode(true);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedTask(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (Object.keys(editedTask).length > 0) {
      try {
        await onTaskUpdate(editedTask);
        setEditedTask({});
        setIsEditMode(false);
      } catch (error) {
        console.error('Erro ao salvar alterações:', error);
      }
    }
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(task);
    }
  };

  return (
    <div className="w-1/2 flex flex-col h-full">
      <TaskHeader
        task={task}
        isEditMode={isEditMode}
        editedTask={editedTask}
        onToggleEdit={handleToggleEdit}
        onFieldChange={handleFieldChange}
        onDuplicate={handleDuplicate}
        onDelete={onDelete}
        canEdit={canEdit}
        canDelete={canDelete}
      />
      
      <div className="flex-1 overflow-y-auto">
        <TaskDetailsForm
          task={task}
          isEditMode={isEditMode}
          editedTask={editedTask}
          onFieldChange={handleFieldChange}
          users={users}
          occupations={occupations}
          timerRunningTaskId={timerRunningTaskId}
          currentTimerValues={currentTimerValues}
          onTimerUpdate={onTimerUpdate}
          onTimerStatusChange={onTimerStatusChange}
        />
      </div>

      {/* Botões de ação para salvar/cancelar quando em modo de edição */}
      {isEditMode && (
        <div className="p-4 border-t bg-muted/30 flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => {
              setEditedTask({});
              setIsEditMode(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={Object.keys(editedTask).length === 0}
          >
            Salvar alterações
          </Button>
        </div>
      )}
    </div>
  );
};