import { Injectable } from '@nestjs/common';
import {
  NotificationType,
  NotificationPriority,
  TaskCreatedPayload,
} from '../interfaces/notification.types';
import {
  BaseNotificationStrategy,
  NotificationPayload,
} from './base-notification.strategy';

@Injectable()
export class TaskCreatedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TASK_CREATED;

  validate(payload: NotificationPayload): boolean {
    const p = payload as Partial<TaskCreatedPayload>;
    return (
      !!p &&
      !!p.task &&
      !!p.task.id &&
      !!p.task.title &&
      !!p.createdBy &&
      typeof p.createdBy === 'number'
    );
  }

  create(
    payload: NotificationPayload,
  ): ReturnType<BaseNotificationStrategy['create']> {
    const p = payload as unknown as TaskCreatedPayload;
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for TaskCreatedStrategy');
    }

    const { task, createdBy, performer } = p;

    const data = {
      actorName: performer?.name || 'Usuário desconhecido',
      taskTitle: task.title,
      taskId: task.id,
      projectTitle: task.project?.title,
    };

    const metadata = this.createTaskMetadata(['created']);
    if (task.project) {
      metadata.tags.push('project');
    }

    return this.createBaseNotification(
      this.type,
      this.getPriority(payload),
      data,
      metadata,
      createdBy,
    );
  }

  getPriority(payload: NotificationPayload): NotificationPriority {
    const p = payload as unknown as TaskCreatedPayload;
    const priorityMap: Record<string, NotificationPriority> = {
      urgente: NotificationPriority.URGENT,
      alta: NotificationPriority.HIGH,
      media: NotificationPriority.MEDIUM,
      baixa: NotificationPriority.LOW,
    };

    return priorityMap[p.task.priority] || NotificationPriority.MEDIUM;
  }
}
