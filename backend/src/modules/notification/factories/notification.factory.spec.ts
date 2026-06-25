import { NotificationFactory } from './notification.factory';
import {
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  StructuredNotification,
  NotificationStrategy,
} from '../interfaces/notification.types';

describe('NotificationFactory', () => {
  let factory: NotificationFactory;

  const mockStrategy: NotificationStrategy = {
    type: NotificationType.TASK_CREATED,
    validate: jest.fn().mockReturnValue(true),
    create: jest.fn().mockReturnValue({
      id: 1,
      userId: 1,
      type: NotificationType.TASK_CREATED,
      priority: NotificationPriority.MEDIUM,
      data: { actorName: 'User', taskTitle: 'Task' },
      metadata: {
        source: 'test',
        category: NotificationCategory.TASK,
        tags: [],
        version: '1',
      },
      isRead: false,
      createdAt: new Date(),
    } as StructuredNotification),
  };

  beforeEach(() => {
    factory = new NotificationFactory([mockStrategy]);
  });

  it('should register strategies on construction', () => {
    expect(factory.hasStrategy(NotificationType.TASK_CREATED)).toBe(true);
    expect(factory.getRegisteredEvents()).toContain(
      NotificationType.TASK_CREATED,
    );
  });

  describe('create', () => {
    it('should create a notification using the matching strategy', () => {
      const payload = { actorName: 'User', taskTitle: 'Task' };

      const result = factory.create(NotificationType.TASK_CREATED, payload);

      expect(result).toBeDefined();
      expect(result.type).toBe(NotificationType.TASK_CREATED);
      expect(mockStrategy.validate).toHaveBeenCalledWith(payload);
      expect(mockStrategy.create).toHaveBeenCalledWith(payload);
    });

    it('should throw when strategy is not found', () => {
      expect(() => factory.create('unknown.event', {})).toThrow(
        'No strategy found for event type: unknown.event',
      );
    });

    it('should throw when payload is invalid', () => {
      mockStrategy.validate.mockReturnValueOnce(false);

      expect(() => factory.create(NotificationType.TASK_CREATED, {})).toThrow(
        'Invalid payload for event type: task.created',
      );
    });
  });

  describe('validateNotification', () => {
    it('should return true for valid task.created notification', () => {
      const notification: Partial<StructuredNotification> = {
        userId: 1,
        type: NotificationType.TASK_CREATED,
        priority: NotificationPriority.MEDIUM,
        data: { actorName: 'User', taskTitle: 'Task' },
        metadata: {
          source: 'test',
          category: NotificationCategory.TASK,
          tags: [],
          version: '1',
        },
      };

      expect(factory.validateNotification(notification)).toBe(true);
    });

    it('should return false when required fields are missing', () => {
      expect(factory.validateNotification({} as StructuredNotification)).toBe(
        false,
      );
    });

    it('should return true for valid task.status.updated data', () => {
      const notification: Partial<StructuredNotification> = {
        userId: 1,
        type: NotificationType.TASK_STATUS_CHANGED,
        priority: NotificationPriority.MEDIUM,
        data: {
          actorName: 'User',
          taskTitle: 'Task',
          oldStatus: 'todo',
          newStatus: 'done',
        },
        metadata: {
          source: 'test',
          category: NotificationCategory.TASK,
          tags: [],
          version: '1',
        },
      };

      expect(factory.validateNotification(notification)).toBe(true);
    });

    it('should return true for generic entity data', () => {
      const notification: Partial<StructuredNotification> = {
        userId: 1,
        type: NotificationType.TIMER_STARTED,
        priority: NotificationPriority.LOW,
        data: { entityType: 'task', entityId: 1 },
        metadata: {
          source: 'test',
          category: NotificationCategory.SYSTEM,
          tags: [],
          version: '1',
        },
      };

      expect(factory.validateNotification(notification)).toBe(true);
    });
  });

  describe('validateRequiredEvents', () => {
    it('should return false when required events are missing', () => {
      expect(factory.validateRequiredEvents()).toBe(false);
    });
  });
});
