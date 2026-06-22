import { Injectable } from '@nestjs/common';
import {
  NotificationType,
  NotificationPriority,
  NotificationMetadata,
  NotificationCategory,
} from '../interfaces/notification.types';
import {
  BaseNotificationStrategy,
  NotificationPayload,
  TaskUpdatedPayloadShape,
} from './base-notification.strategy';

@Injectable()
export class TaskUpdatedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TASK_UPDATED;

  validate(payload: NotificationPayload): boolean {
    const p = payload as Partial<TaskUpdatedPayloadShape>;
    return (
      !!p &&
      !!p.task &&
      !!p.task.id &&
      !!p.task.title &&
      !!p.updatedBy &&
      typeof p.updatedBy === 'number' &&
      Array.isArray(p.changedFields)
    );
  }

  create(
    payload: NotificationPayload,
  ): ReturnType<BaseNotificationStrategy['create']> {
    const p = payload as unknown as TaskUpdatedPayloadShape;
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for TaskUpdatedStrategy');
    }

    const { task, updatedBy, performer, changedFields } = p;

    const data = {
      actorName: performer?.name || 'Usuário desconhecido',
      taskTitle: task.title,
      taskId: task.id,
      changedFields: changedFields.map((field) => ({
        field: field.field,
        oldValue: field.oldValue,
        newValue: field.newValue,
      })),
    };

    const metadata: NotificationMetadata = {
      source: 'task_system',
      category: NotificationCategory.TASK,
      tags: ['task', 'updated'],
      version: '1.0',
    };

    return this.createBaseNotification(
      this.type,
      NotificationPriority.MEDIUM,
      data,
      metadata,
      updatedBy,
    );
  }

  getPriority(_payload: NotificationPayload): NotificationPriority {
    return NotificationPriority.MEDIUM;
  }
}
