import { Injectable } from '@nestjs/common';
import {
  NotificationType,
  NotificationPriority,
  NotificationMetadata,
  NotificationCategory,
  TimerEventPayload,
} from '../interfaces/notification.types';
import {
  BaseNotificationStrategy,
  NotificationPayload,
} from './base-notification.strategy';

@Injectable()
export class TimerPausedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TIMER_PAUSED;

  validate(payload: NotificationPayload): boolean {
    const p = payload as Partial<TimerEventPayload>;
    return !!p && !!p.task && !!p.task.id && !!p.userId;
  }

  create(
    payload: NotificationPayload,
  ): ReturnType<BaseNotificationStrategy['create']> {
    const p = payload as unknown as TimerEventPayload;
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for TimerPausedStrategy');
    }

    const { task, userId, performer, duration } = p;

    const data = {
      entityType: 'timer',
      entityId: task.id,
      action: 'paused',
      changes: {
        timer: {
          oldValue: {
            taskId: task.id,
            status: 'running',
          },
          newValue: {
            taskId: task.id,
            duration: duration || 0,
            status: 'paused',
          },
        },
      },
      relatedEntities: [
        {
          type: 'timer',
          id: task.id,
          name: `Timer da tarefa ${task.title}`,
          metadata: {
            taskId: task.id,
            duration: duration || 0,
            status: 'paused',
          },
        },
        ...this.createTaskRelatedEntities(task, performer),
      ],
      context: this.createNotificationContext(performer, 'timer_pause', {
        duration,
      }),
    };

    const metadata: NotificationMetadata = {
      source: 'timer_system',
      category: NotificationCategory.TIMER,
      tags: ['timer', 'paused', 'task'],
      version: '1.0',
    };

    return this.createBaseNotification(
      this.type,
      this.getPriority(payload),
      data,
      metadata,
      userId,
    );
  }

  getPriority(_payload: NotificationPayload): NotificationPriority {
    return NotificationPriority.LOW;
  }
}
