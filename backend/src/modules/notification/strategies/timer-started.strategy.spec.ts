import {
  NotificationType,
  NotificationPriority,
} from '../interfaces/notification.types';
import { TimerStartedStrategy } from './timer-started.strategy';

describe('TimerStartedStrategy', () => {
  let strategy: TimerStartedStrategy;

  const validPayload = {
    task: { id: 1, title: 'Task' },
    userId: 1,
    performer: { id: 1, name: 'User', email: 'user@test.com' },
    duration: 300,
  };

  beforeEach(() => {
    strategy = new TimerStartedStrategy();
  });

  it('should have type TIMER_STARTED', () => {
    expect(strategy.type).toBe(NotificationType.TIMER_STARTED);
  });

  it('should return action "started"', () => {
    expect(strategy.getAction()).toBe('started');
  });

  it('should return status "running"', () => {
    expect(strategy.getStatus()).toBe('running');
  });

  it('should return oldValue as null', () => {
    expect(strategy.getOldValue()).toBeNull();
  });

  it('should create a StructuredNotification with action "started"', () => {
    const notification = strategy.create(validPayload);

    expect(notification.type).toBe(NotificationType.TIMER_STARTED);
    expect(notification.priority).toBe(NotificationPriority.LOW);
    expect(notification.data).toMatchObject({
      entityType: 'timer',
      entityId: 1,
      action: 'started',
    });
  });
});
