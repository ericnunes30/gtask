import { Injectable } from '@nestjs/common';
import {
  NotificationType,
  NotificationPriority,
  TaskStatusUpdatedPayload,
} from '../interfaces/notification.types';
import {
  BaseNotificationStrategy,
  NotificationPayload,
} from './base-notification.strategy';

@Injectable()
export class TaskStatusUpdatedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TASK_STATUS_CHANGED;

  validate(payload: NotificationPayload): boolean {
    const p = payload as Partial<TaskStatusUpdatedPayload>;
    return (
      !!p &&
      !!p.task &&
      !!p.task.id &&
      !!p.oldStatus &&
      !!p.newStatus &&
      !!p.updatedBy
    );
  }

  create(
    payload: NotificationPayload,
  ): ReturnType<BaseNotificationStrategy['create']> {
    const p = payload as unknown as TaskStatusUpdatedPayload;
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for TaskStatusUpdatedStrategy');
    }

    const { task, oldStatus, newStatus, updatedBy, performer } = p;

    const data = {
      actorName: performer?.name || 'Usuário desconhecido',
      taskTitle: task.title,
      taskId: task.id,
      oldStatus,
      newStatus,
    };

    const metadata = this.createTaskMetadata(['status_updated']);
    if (task.project) {
      metadata.tags.push('project');
    }

    return this.createBaseNotification(
      this.type,
      this.getPriority({ oldStatus, newStatus } as NotificationPayload),
      data,
      metadata,
      updatedBy,
    );
  }

  getPriority(payload: NotificationPayload): NotificationPriority {
    const p = payload as { oldStatus: string; newStatus: string };
    const criticalStatuses = ['concluido', 'cancelado', 'em_revisao'];
    const mediumStatuses = ['em_andamento', 'aguardando_cliente'];

    if (criticalStatuses.includes(p.newStatus)) {
      return NotificationPriority.HIGH;
    }

    if (mediumStatuses.includes(p.newStatus) && p.oldStatus === 'pendente') {
      return NotificationPriority.MEDIUM;
    }

    return NotificationPriority.LOW;
  }
}
