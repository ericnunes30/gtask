import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTaskDetails } from '@/hooks/useTaskDetails';
import { useTaskComments } from '@/hooks/useTaskComments';
import TaskDetailsHeader from '@/components/tasks/TaskDetails/TaskDetailsHeader';
import TaskDescription from './TaskDetails/TaskDescription';
import TaskProperties from './TaskDetails/TaskProperties';
import TaskAssignments from './TaskDetails/TaskAssignments';
import TaskActivity from './TaskDetails/TaskActivity';
import TaskTimerDisplay from './TaskDetails/TaskTimerDisplay';
import { useBackendServices } from '@/hooks/useBackendServices';
import TaskDetailedFields from './TaskDetails/TaskDetailedFields';
import TaskDetailsPopup from './TaskDetailsPopup';
import { Task } from '@/common/types';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number | null;
  onTaskUpdated: () => void;
  onDuplicateTask?: (task: Task) => void;
  timerRunningTaskId?: string | null;
  setTimerRunningTaskId?: (taskId: string | null) => void;
  currentTimerValues?: Record<string, number>;
  setCurrentTimerValues?: (values: Record<string, number>) => void;
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  isOpen,
  onClose,
  taskId,
  onTaskUpdated,
  onDuplicateTask,
  timerRunningTaskId,
  setTimerRunningTaskId,
  currentTimerValues,
  setCurrentTimerValues,
}) => {
  const { users: usersService, occupations: occupationsService } = useBackendServices();
  const { data: allUsers = [] } = usersService.useGetUsers();
  const { data: allOccupations = [] } = occupationsService.useGetOccupations();

  const {
    task,
    setTask,
    loading,
    error,
    isEditMode,
    editedTask,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    startEditMode,
    cancelEditMode,
    handleFieldChange,
    saveChanges,
    deleteTask,
    updateTask,
    refetchTaskDetails,
    projectDetails,
  } = useTaskDetails(taskId, onTaskUpdated);

  const {
    comments,
    comment,
    handleCommentChange,
    handleAddComment,
    isSubmittingComment,
    users,
    mentionQuery,
    showMentionsList,
    handleMentionUser,
    getFilteredUsers,
  } = useTaskComments(task, refetchTaskDetails);


  const [activityTab, setActivityTab] = useState<'all' | 'comments' | 'history'>('all');
  const [isFullScreenEditorOpen, setIsFullScreenEditorOpen] = useState(false);
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);

  const handleSaveFullScreenContent = (content: string) => {
    handleFieldChange('description', content);
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[1000px]">
          <DialogTitle>Carregando...</DialogTitle>
          <DialogDescription>Carregando detalhes da tarefa...</DialogDescription>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[1000px]">
          <DialogTitle>Erro</DialogTitle>
          <DialogDescription>{error}</DialogDescription>
          <DialogFooter>
            <Button onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[1100px] max-h-[90vh] flex flex-col overflow-y-auto p-0">
          <DialogTitle className="sr-only">{task.title}</DialogTitle>
          <div className="flex h-[90vh] overflow-y-hidden">
            <div className="w-1/2 border-r overflow-y-auto p-6 bg-card text-card-foreground">
              <TaskDetailsHeader
                task={task}
                isEditMode={isEditMode}
                editedTask={editedTask || {}}
                isDeleteDialogOpen={isDeleteDialogOpen}
                onFieldChange={handleFieldChange}
                onToggleComplete={saveChanges} // This is fine as saveChanges will persist the whole editedTask
                onDuplicateTask={onDuplicateTask}
                onSaveChanges={saveChanges}
                onCancelEditMode={cancelEditMode}
                onStartEditMode={startEditMode}
                onDeleteTask={deleteTask}
                setIsDeleteDialogOpen={setIsDeleteDialogOpen}
                onTaskUpdated={onTaskUpdated}
                updateTask={updateTask as any}
                setTask={setTask as any}
              />
              <TaskDescription
                task={task}
                isEditMode={isEditMode}
                editedTask={editedTask}
                onFieldChange={handleFieldChange}
                setIsFullScreenEditorOpen={setIsFullScreenEditorOpen}
              />
              <Separator className="my-4" />
              <div className="space-y-5 mt-4">
                <TaskProperties
                  task={task}
                  isEditMode={isEditMode}
                  editedTask={editedTask}
                  onFieldChange={handleFieldChange}
                  updateTask={updateTask as any}
                  onTaskUpdated={onTaskUpdated}
                  setTask={setTask as any}
                />
                <TaskDetailedFields
                  task={task}
                  editedTask={editedTask}
                  isEditMode={isEditMode}
                  handleFieldChange={handleFieldChange}
                  setShowDetailsPopup={setShowDetailsPopup}
                />
                <TaskAssignments
                  task={task}
                  isEditMode={isEditMode}
                  editedTask={editedTask}
                  onFieldChange={handleFieldChange}
                  users={allUsers}
                  occupations={allOccupations}
                />
                <TaskTimerDisplay
                  task={task}
                  onTaskUpdated={onTaskUpdated}
                  timerRunningTaskId={timerRunningTaskId}
                  setTimerRunningTaskId={setTimerRunningTaskId}
                  currentTimerValues={currentTimerValues}
                  setCurrentTimerValues={setCurrentTimerValues}
                />
              </div>
            </div>
            <TaskActivity
              task={task}
              comments={comments}
              history={task.activityLogs || []}
              activityTab={activityTab}
              setActivityTab={setActivityTab}
              comment={comment}
              onCommentChange={handleCommentChange}
              onAddComment={handleAddComment}
              isSubmittingComment={isSubmittingComment}
              users={allUsers}
              mentionQuery={mentionQuery}
              showMentionsList={showMentionsList}
              onMentionUser={handleMentionUser}
              getFilteredUsers={() => getFilteredUsers(mentionQuery)}
              onReplySuccessfullyAdded={refetchTaskDetails}
            />
          </div>
        </DialogContent>
      </Dialog>
      {task && (
        <TaskDetailsPopup
          isOpen={showDetailsPopup}
          onClose={() => setShowDetailsPopup(false)}
          task={task}
        />
      )}
    </>
  );
};

export default TaskDetailsModal;
