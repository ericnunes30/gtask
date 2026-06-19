export interface PermissionChecker {
  canNotifyTaskCreator(taskId: number, userId: number): Promise<boolean>;
  canNotifyTaskAssignee(taskId: number, userId: number): Promise<boolean>;
  canNotifyProjectMember(projectId: number, userId: number): Promise<boolean>;
  canNotifyCommentAuthor(commentId: number, userId: number): Promise<boolean>;
  canNotifyReviewer(taskId: number, userId: number): Promise<boolean>;
}

export interface NotificationRecipientFilter {
  filterTaskCreatedRecipients(
    taskId: number,
    createdBy: number,
  ): Promise<number[]>;
  filterTaskUpdatedRecipients(
    taskId: number,
    updatedBy: number,
  ): Promise<number[]>;
  filterTaskStatusChangedRecipients(
    taskId: number,
    updatedBy: number,
    newStatus: string,
  ): Promise<number[]>;
  filterCommentCreatedRecipients(
    commentId: number,
    createdBy: number,
  ): Promise<number[]>;
}
