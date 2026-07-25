import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'socket.io';

export function bridgeTaskEvents(
  server: Server,
  eventEmitter: EventEmitter2,
  logger: Logger,
): void {
  // Bridge task.created -> WebSocket
  eventEmitter.on(
    'task.created',
    (payload: {
      task: { id: number; project?: { id: number } };
      createdBy: number;
    }) => {
      const projectId = payload.task.project?.id;
      if (projectId) {
        logger.log(`Bridging task.created for project ${projectId}`);
        server?.to(`project_${projectId}`).emit('task.created', payload);
      }
      server?.to('tasks_all').emit('task.created', payload);
    },
  );

  // Bridge task.updated -> WebSocket
  eventEmitter.on(
    'task.updated',
    (payload: {
      task: {
        id: number;
        project?: { id: number };
        assignee?: { id: number };
      };
      updatedBy: number;
      changedFields: Record<string, unknown>;
    }) => {
      const projectId = payload.task.project?.id;
      const assigneeId = payload.task.assignee?.id;
      if (projectId) {
        logger.log(`Bridging task.updated for project ${projectId}`);
        server?.to(`project_${projectId}`).emit('task.updated', payload);
      }
      if (assigneeId) {
        server?.to(`user_${assigneeId}`).emit('task.updated', payload);
      }
      server?.to('tasks_all').emit('task.updated', payload);
    },
  );

  // Bridge task.status.changed -> WebSocket
  eventEmitter.on(
    'task.status.changed',
    (payload: {
      task: {
        id: number;
        project?: { id: number };
        assignee?: { id: number };
      };
      updatedBy: number;
      oldStatus: string;
      newStatus: string;
    }) => {
      const projectId = payload.task.project?.id;
      const assigneeId = payload.task.assignee?.id;
      if (projectId) {
        logger.log(`Bridging task.status.changed for project ${projectId}`);
        server?.to(`project_${projectId}`).emit('task.status.changed', payload);
      }
      if (assigneeId) {
        server?.to(`user_${assigneeId}`).emit('task.status.changed', payload);
      }
      server?.to('tasks_all').emit('task.status.changed', payload);
    },
  );

  // Bridge task.assignees.updated -> WebSocket
  eventEmitter.on(
    'task.assignees.updated',
    (payload: {
      taskId: number;
      projectId?: number;
      assigneeIds: number[];
    }) => {
      logger.log(`Bridging task.assignees.updated for task ${payload.taskId}`);
      if (payload.projectId) {
        server
          ?.to(`project_${payload.projectId}`)
          .emit('task.assignees.updated', payload);
      }
      for (const userId of payload.assigneeIds) {
        server?.to(`user_${userId}`).emit('task.assignees.updated', payload);
      }
      server?.to('tasks_all').emit('task.assignees.updated', payload);
    },
  );

  // Bridge comment.created -> WebSocket
  eventEmitter.on(
    'comment.created',
    (payload: {
      comment: { task?: { id: number; project?: { id: number } } };
      createdBy: number;
    }) => {
      const projectId = payload.comment.task?.project?.id;
      if (projectId) {
        logger.log(`Bridging comment.created for project ${projectId}`);
        server?.to(`project_${projectId}`).emit('comment.created', payload);
      }
      server?.to('tasks_all').emit('comment.created', payload);
    },
  );

  // Bridge comment.updated -> WebSocket
  eventEmitter.on(
    'comment.updated',
    (payload: {
      comment: { task?: { id: number; project?: { id: number } } };
    }) => {
      const projectId = payload.comment.task?.project?.id;
      if (projectId) {
        logger.log(`Bridging comment.updated for project ${projectId}`);
        server?.to(`project_${projectId}`).emit('comment.updated', payload);
      }
      server?.to('tasks_all').emit('comment.updated', payload);
    },
  );

  // Bridge comment.deleted -> WebSocket
  eventEmitter.on(
    'comment.deleted',
    (payload: { commentId: number; taskId?: number }) => {
      logger.log(`Bridging comment.deleted for comment ${payload.commentId}`);
      server?.to('tasks_all').emit('comment.deleted', payload);
    },
  );
}
