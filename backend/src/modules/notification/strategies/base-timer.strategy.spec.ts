import {
  NotificationType,
  NotificationPriority,
} from '../interfaces/notification.types';
import { BaseTimerStrategy } from './base-timer.strategy';
import { InvalidStrategyPayloadException } from '../exceptions/invalid-strategy-payload.exception';

class TestTimerStrategy extends BaseTimerStrategy {
  override readonly type = NotificationType.TIMER_STARTED;

  getAction(): string {
    return 'started';
  }

  getStatus(): string {
    return 'running';
  }

  getOldValue(): Record<string, unknown> | null {
    return null;
  }
}

describe('BaseTimerStrategy', () => {
  let strategy: TestTimerStrategy;

  const validPayload = {
    task: { id: 1, title: 'Task' },
    userId: 1,
    performer: { id: 1, name: 'User', email: 'user@test.com' },
    duration: 300,
  };

  beforeEach(() => {
    strategy = new TestTimerStrategy();
  });

  describe('validate', () => {
    it('should return true with a valid payload', () => {
      expect(strategy.validate(validPayload)).toBe(true);
    });

    it('should return false when payload is missing task', () => {
      const payload = { userId: 1 };
      expect(strategy.validate(payload)).toBe(false);
    });

    it('should return false when task has no id', () => {
      const payload = { task: { title: 'Task' }, userId: 1 };
      expect(strategy.validate(payload)).toBe(false);
    });

    it('should return false when payload is missing userId', () => {
      const payload = { task: { id: 1, title: 'Task' } };
      expect(strategy.validate(payload)).toBe(false);
    });
  });

  describe('create', () => {
    it('should return a StructuredNotification for a valid payload', () => {
      const notification = strategy.create(validPayload);

      expect(notification.type).toBe(NotificationType.TIMER_STARTED);
      expect(notification.priority).toBe(NotificationPriority.LOW);
      expect(notification.id).toBe(0);
      expect(notification.isRead).toBe(false);
      expect(notification.userId).toBe(1);
    });

    it('should throw InvalidStrategyPayloadException for an invalid payload', () => {
      expect(() => strategy.create({})).toThrow(
        InvalidStrategyPayloadException,
      );
    });
  });

  describe('getPriority', () => {
    it('should return LOW priority', () => {
      expect(strategy.getPriority(validPayload)).toBe(NotificationPriority.LOW);
    });
  });
});
