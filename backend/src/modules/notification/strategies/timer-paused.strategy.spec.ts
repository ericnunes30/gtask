import {
  NotificationType,
  NotificationPriority,
} from '../interfaces/notification.types';
import { TimerPausedStrategy } from './timer-paused.strategy';

describe('TimerPausedStrategy', () => {
  let strategy: TimerPausedStrategy;

  const validPayload = {
    task: { id: 1, title: 'Task' },
    userId: 1,
    performer: { id: 1, name: 'User', email: 'user@test.com' },
    duration: 300,
  };

  beforeEach(() => {
    strategy = new TimerPausedStrategy();
  });

  it('should have type TIMER_PAUSED', () => {
    expect(strategy.type).toBe(NotificationType.TIMER_PAUSED);
  });

  it('should return action "paused"', () => {
    expect(strategy.getAction()).toBe('paused');
  });

  it('should return status "paused"', () => {
    expect(strategy.getStatus()).toBe('paused');
  });

  it('should return oldValue with taskId and status', () => {
    const oldValue = strategy.getOldValue();
    expect(oldValue).toEqual({ taskId: 0, status: 'running' });
  });

  it('should create a StructuredNotification with action "paused"', () => {
    const notification = strategy.create(validPayload);

    expect(notification.type).toBe(NotificationType.TIMER_PAUSED);
    expect(notification.priority).toBe(NotificationPriority.LOW);
    expect(notification.data).toMatchObject({
      entityType: 'timer',
      entityId: 1,
      action: 'paused',
    });
  });
});
