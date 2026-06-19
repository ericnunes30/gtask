import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from '../entities/activity-log.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Comment } from '../../comment/entities/comment.entity';

@Injectable()
export class ActivityLogListener {
  private readonly logger = new Logger(ActivityLogListener.name);

  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
  ) {}

  @OnEvent('task.created')
  async handleTaskCreatedEvent(payload: { task: Task; createdBy: number }) {
    this.logger.log(
      `ActivityLogListener: Handling task.created event for task #${payload.task.id}`,
    );
    const { task, createdBy } = payload;

    const log = this.activityLogRepository.create({
      userId: createdBy,
      taskId: task.id,
      actionType: 'CREATE_TASK',
      newValue: task.title, // Log o título como valor principal
      details: {
        title: task.title,
        status: task.status,
        priority: task.priority,
        projectId: task.project_id,
      },
    });

    try {
      await this.activityLogRepository.save(log);
      this.logger.log(`Activity log saved for new task #${task.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to save activity log for new task #${task.id}`,
        error.stack,
      );
    }
  }

  @OnEvent('comment.created')
  async handleCommentCreatedEvent(payload: {
    comment: Comment;
    createdBy: number;
  }) {
    this.logger.log(
      `ActivityLogListener: Handling comment.created event for task #${payload.comment.task_id}`,
    );
    const { comment, createdBy } = payload;

    const log = this.activityLogRepository.create({
      userId: createdBy,
      taskId: comment.task_id,
      actionType: 'CREATE_COMMENT',
      newValue: comment.content,
    });

    try {
      await this.activityLogRepository.save(log);
      this.logger.log(
        `Activity log for new comment on task #${comment.task_id} saved`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to save activity log for new comment on task #${comment.task_id}`,
        error.stack,
      );
    }
  }

  @OnEvent('task.updated')
  async handleTaskUpdatedEvent(payload: {
    task: Task;
    updatedBy: number;
    changedFields: Record<string, { oldValue: any; newValue: any }>;
  }) {
    this.logger.log(
      `ActivityLogListener: Handling task.updated event for task #${payload.task.id}`,
    );
    const { task, updatedBy, changedFields } = payload;

    for (const [field, changes] of Object.entries(changedFields)) {
      const log = this.activityLogRepository.create({
        userId: updatedBy,
        taskId: task.id,
        actionType: 'TASK_UPDATED',
        changedField: field,
        oldValue: String(changes.oldValue),
        newValue: String(changes.newValue),
      });

      try {
        await this.activityLogRepository.save(log);
        this.logger.log(
          `Activity log saved for task #${task.id} field '${field}' update`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to save activity log for task #${task.id} field '${field}' update`,
          error.stack,
        );
      }
    }
  }

  @OnEvent('task.status.updated')
  async handleTaskStatusUpdatedEvent(payload: {
    task: Task;
    updatedBy: number;
    oldStatus: string;
    newStatus: string;
  }) {
    this.logger.log(
      `ActivityLogListener: Handling task.status.updated event for task #${payload.task.id}`,
    );
    const { task, updatedBy, oldStatus, newStatus } = payload;

    const log = this.activityLogRepository.create({
      userId: updatedBy,
      taskId: task.id,
      actionType: 'TASK_STATUS_UPDATED',
      changedField: 'status',
      oldValue: oldStatus,
      newValue: newStatus,
    });

    try {
      await this.activityLogRepository.save(log);
      this.logger.log(`Activity log saved for task #${task.id} status update`);
    } catch (error) {
      this.logger.error(
        `Failed to save activity log for task #${task.id} status update`,
        error.stack,
      );
    }
  }

  @OnEvent('task.assignees.updated')
  async handleTaskAssigneesUpdatedEvent(payload: {
    task: Task;
    updatedBy: number;
    action: 'set' | 'remove';
    userIds: number[];
  }) {
    this.logger.log(
      `ActivityLogListener: Handling task.assignees.updated event for task #${payload.task.id}`,
    );
    const { task, updatedBy, action, userIds } = payload;

    const log = this.activityLogRepository.create({
      userId: updatedBy,
      taskId: task.id,
      actionType:
        action === 'set' ? 'TASK_ASSIGNEES_SET' : 'TASK_ASSIGNEES_REMOVED',
      newValue: JSON.stringify(userIds),
    });

    try {
      await this.activityLogRepository.save(log);
      this.logger.log(
        `Activity log saved for task #${task.id} assignees ${action}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to save activity log for task #${task.id} assignees ${action}`,
        error.stack,
      );
    }
  }
}
