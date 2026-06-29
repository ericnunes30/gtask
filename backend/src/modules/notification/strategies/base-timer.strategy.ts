import { Injectable } from '@nestjs/common';
import {
  NotificationType,
  NotificationPriority,
  TimerEventPayload,
} from '../interfaces/notification.types';
import {
  BaseNotificationStrategy,
  NotificationPayload,
} from './base-notification.strategy';
import { InvalidStrategyPayloadException } from '../exceptions/invalid-strategy-payload.exception';

@Injectable()
export abstract class BaseTimerStrategy extends BaseNotificationStrategy {
  abstract override readonly type: NotificationType;

  validate(payload: NotificationPayload): boolean {
    const p = payload as Partial<TimerEventPayload>;
    return !!p && !!p.task && !!p.task.id && !!p.userId;
  }

  getPriority(_payload: NotificationPayload): NotificationPriority {
    return NotificationPriority.LOW;
  }

  abstract getAction(): string;
  abstract getStatus(): string;
  abstract getOldValue(): Record<string, unknown> | null;

  override create(
    payload: NotificationPayload,
  ): ReturnType<BaseNotificationStrategy['create']> {
    const p = payload as unknown as TimerEventPayload;
    if (!this.validate(payload)) {
      throw new InvalidStrategyPayloadException(this.type);
    }

    const { task, userId, performer, duration } = p;

    const data = this.createTimerNotificationData(
      task,
      this.getAction(),
      this.getStatus(),
      duration,
      this.getOldValue(),
      performer,
    );

    const metadata = this.createTimerMetadata(this.getAction());

    return this.createBaseNotification(
      this.type,
      this.getPriority(payload),
      data,
      metadata,
      userId,
    );
  }
}
