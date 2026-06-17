import React from 'react';
import { Task } from '@/utils/commonTypes';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { usePermissions } from '@/hooks/usePermissions';

interface TaskDescriptionProps {
  task: Task;
  isEditMode: boolean;
  editedTask?: Partial<Task> | null;
  onFieldChange: (field: keyof Task, value: any) => void;
  isFullScreenEditorOpen?: boolean;
  setIsFullScreenEditorOpen?: (open: boolean) => void;
  handleSaveFullScreenContent?: (content: string) => void;
}

const TaskDescription: React.FC<TaskDescriptionProps> = ({
  task,
  isEditMode,
  editedTask,
  onFieldChange,
  setIsFullScreenEditorOpen,
}) => {
  const permissions = usePermissions();
  const descriptionContent = editedTask?.description !== undefined ? editedTask.description : task.description || '';

  return (
    <div className="mb-6 mt-4">
      <h3 className="font-medium mb-2">Descrição</h3>
      {isEditMode && !permissions.isMember ? (
        <RichTextEditor
          content={descriptionContent}
          onChange={(html) => onFieldChange('description', html)}
          editable={true}
          onExpand={() => setIsFullScreenEditorOpen && setIsFullScreenEditorOpen(true)}
        />
      ) : (
        <div id="task-description" className="prose dark:prose-invert text-sm p-3 border rounded-md bg-muted/30 min-h-[100px] overflow-auto prose-sm max-w-none [&_br]:block [&_br]:mb-2 [&_.hard-break]:block [&_.hard-break]:mb-2 [&_p:empty]:h-6 [&_p:empty]:block">
          {task.description ? (
            <div dangerouslySetInnerHTML={{ __html: task.description }} />
          ) : (
            'Sem descrição.'
          )}
        </div>
      )}
    </div>
  );
};

export default TaskDescription;