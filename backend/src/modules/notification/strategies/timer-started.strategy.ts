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
export class TimerStartedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TIMER_STARTED;

  validate(payload: NotificationPayload): boolean {
    const p = payload as Partial<TimerEventPayload>;
    return !!p && !!p.task && !!p.task.id && !!p.userId;
  }

  create(
    payload: NotificationPayload,
  ): ReturnType<BaseNotificationStrategy['create']> {
    const p = payload as unknown as TimerEventPayload;
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for TimerStartedStrategy');
    }

    const { task, userId, performer, duration } = p;

    const data = {
      entityType: 'timer',
      entityId: task.id,
      action: 'started',
      changes: {
        timer: {
          oldValue: null,
          newValue: {
            taskId: task.id,
            duration: duration || 0,
            status: 'running',
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
            status: 'running',
          },
        },
        ...this.createTaskRelatedEntities(task, performer),
      ],
      context: this.createNotificationContext(performer, 'timer_start', {
        duration,
      }),
    };

    const metadata: NotificationMetadata = {
      source: 'timer_system',
      category: NotificationCategory.TIMER,
      tags: ['timer', 'started', 'task'],
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
