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
import { InvalidStrategyPayloadException } from '../exceptions/invalid-strategy-payload.exception';

@Injectable()
export class TaskUpdatedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TASK_UPDATED;

  validate(payload: NotificationPayload): boolean {
    const p = payload as Partial<TaskUpdatedPayloadShape>;
    const hasValidChangedFields =
      !!p.changedFields &&
      (Array.isArray(p.changedFields) || typeof p.changedFields === 'object');
    return (
      !!p &&
      !!p.task &&
      !!p.task.id &&
      !!p.task.title &&
      !!p.updatedBy &&
      typeof p.updatedBy === 'number' &&
      hasValidChangedFields
    );
  }

  create(
    payload: NotificationPayload,
  ): ReturnType<BaseNotificationStrategy['create']> {
    const p = payload as unknown as TaskUpdatedPayloadShape;
    if (!this.validate(payload)) {
      throw new InvalidStrategyPayloadException(NotificationType.TASK_UPDATED);
    }

    const { task, updatedBy, performer, changedFields } = p;

    const changedFieldsArray: Array<{
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }> = Array.isArray(changedFields)
      ? changedFields
      : Object.entries(changedFields as Record<string, { oldValue: unknown; newValue: unknown }>).map(
          ([field, values]) => ({
            field,
            oldValue: values.oldValue,
            newValue: values.newValue,
          }),
        );

    const data = {
      actorName: performer?.name || 'Usuário desconhecido',
      taskTitle: task.title,
      taskId: task.id,
      changedFields: changedFieldsArray.map((field) => ({
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
