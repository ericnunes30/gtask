import { Injectable } from '@nestjs/common';
import { NotificationType } from '../interfaces/notification.types';
import { BaseTimerStrategy } from './base-timer.strategy';

@Injectable()
export class TimerPausedStrategy extends BaseTimerStrategy {
  override readonly type = NotificationType.TIMER_PAUSED;

  getAction(): string {
    return 'paused';
  }

  getStatus(): string {
    return 'paused';
  }

  getOldValue(): Record<string, unknown> {
    return { taskId: 0, status: 'running' };
  }
}
