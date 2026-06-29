import { Injectable } from '@nestjs/common';
import { NotificationType } from '../interfaces/notification.types';
import { BaseTimerStrategy } from './base-timer.strategy';

@Injectable()
export class TimerStartedStrategy extends BaseTimerStrategy {
  override readonly type = NotificationType.TIMER_STARTED;

  getAction(): string {
    return 'started';
  }

  getStatus(): string {
    return 'running';
  }

  getOldValue(): null {
    return null;
  }
}
