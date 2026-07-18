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

    it('should return true when all required events are registered', () => {
      const allStrategies: NotificationStrategy[] = [
        'task.created',
        'task.status.changed',
        'comment.created',
        'timer.started',
        'timer.paused',
        'task.updated',
      ].map((type) => ({
        type,
        validate: jest.fn().mockReturnValue(true),
        create: jest.fn(),
      }));
      const fullFactory = new NotificationFactory(allStrategies);
      expect(fullFactory.validateRequiredEvents()).toBe(true);
    });
  });

  describe('validateNotification - all data shapes', () => {
    it('should return true for valid comment.created data', () => {
      const notification: Partial<StructuredNotification> = {
        userId: 1,
        type: NotificationType.COMMENT_CREATED,
        priority: NotificationPriority.LOW,
        data: {
          actorName: 'User',
          taskTitle: 'Task',
          commentSnippet: 'snippet text',
        },
        metadata: {
          source: 'test',
          category: NotificationCategory.COMMENT,
          tags: [],
          version: '1',
        },
      };
      expect(factory.validateNotification(notification)).toBe(true);
    });

    it('should return false for invalid comment.created data missing commentSnippet', () => {
      // Use a shape that is not valid for any of the typed shapes
      // and does not have entityType/entityId
      const notification: Partial<StructuredNotification> = {
        userId: 1,
        type: NotificationType.COMMENT_CREATED,
        priority: NotificationPriority.LOW,
        data: { random: 'value' },
        metadata: {
          source: 'test',
          category: NotificationCategory.COMMENT,
          tags: [],
          version: '1',
        },
      };
      expect(factory.validateNotification(notification)).toBe(false);
    });

    it('should return true for valid task.updated data with changedFields', () => {
      const notification: Partial<StructuredNotification> = {
        userId: 1,
        type: NotificationType.TASK_UPDATED,
        priority: NotificationPriority.MEDIUM,
        data: {
          actorName: 'User',
          taskTitle: 'Task',
          changedFields: [{ field: 'title', oldValue: 'a', newValue: 'b' }],
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

    it('should return false for task.updated with non-string field in changedFields', () => {
      // Shape that is not valid task.created/task.status/comment
      // and not entityType/entityId
      const notification: Partial<StructuredNotification> = {
        userId: 1,
        type: NotificationType.TASK_UPDATED,
        priority: NotificationPriority.MEDIUM,
        data: {
          changedFields: [{ field: 123, oldValue: 'a', newValue: 'b' }],
        },
        metadata: {
          source: 'test',
          category: NotificationCategory.TASK,
          tags: [],
          version: '1',
        },
      };
      expect(factory.validateNotification(notification)).toBe(false);
    });

    it('should return false for task.updated when changedFields is not an array', () => {
      const notification: Partial<StructuredNotification> = {
        userId: 1,
        type: NotificationType.TASK_UPDATED,
        priority: NotificationPriority.MEDIUM,
        data: { changedFields: 'not an array' },
        metadata: {
          source: 'test',
          category: NotificationCategory.TASK,
          tags: [],
          version: '1',
        },
      };
      expect(factory.validateNotification(notification)).toBe(false);
    });

    it('should return false when data is missing', () => {
      const notification: Partial<StructuredNotification> = {
        userId: 1,
        type: NotificationType.TASK_CREATED,
        priority: NotificationPriority.MEDIUM,
        metadata: {
          source: 'test',
          category: NotificationCategory.TASK,
          tags: [],
          version: '1',
        },
      };
      expect(factory.validateNotification(notification)).toBe(false);
    });

    it('should return false for invalid data without entityType or known shape', () => {
      const notification: Partial<StructuredNotification> = {
        userId: 1,
        type: NotificationType.TASK_CREATED,
        priority: NotificationPriority.MEDIUM,
        data: { foo: 'bar' },
        metadata: {
          source: 'test',
          category: NotificationCategory.TASK,
          tags: [],
          version: '1',
        },
      };
      expect(factory.validateNotification(notification)).toBe(false);
    });

    it('should return true for generic entity data with entityType+entityId', () => {
      const notification: Partial<StructuredNotification> = {
        userId: 1,
        type: NotificationType.TASK_CREATED,
        priority: NotificationPriority.MEDIUM,
        data: { entityType: 'task', entityId: 5 },
        metadata: {
          source: 'test',
          category: NotificationCategory.SYSTEM,
          tags: [],
          version: '1',
        },
      };
      expect(factory.validateNotification(notification)).toBe(true);
    });

    it('should return false for task.updated when field is null in changedFields', () => {
      // No actorName/taskTitle → isValidTaskCreatedData returns false
      // No changedFields as array of valid items → isValidTaskUpdatedData returns false
      const notification: Partial<StructuredNotification> = {
        userId: 1,
        type: NotificationType.TASK_UPDATED,
        priority: NotificationPriority.MEDIUM,
        data: { changedFields: [null] },
        metadata: {
          source: 'test',
          category: NotificationCategory.TASK,
          tags: [],
          version: '1',
        },
      };
      expect(factory.validateNotification(notification)).toBe(false);
    });

    it('should return false for task.updated when field is not an object', () => {
      const notification: Partial<StructuredNotification> = {
        userId: 1,
        type: NotificationType.TASK_UPDATED,
        priority: NotificationPriority.MEDIUM,
        data: { changedFields: ['string-field'] },
        metadata: {
          source: 'test',
          category: NotificationCategory.TASK,
          tags: [],
          version: '1',
        },
      };
      expect(factory.validateNotification(notification)).toBe(false);
    });

    it('should return false for task.updated when oldValue is not a string', () => {
      const notification: Partial<StructuredNotification> = {
        userId: 1,
        type: NotificationType.TASK_UPDATED,
        priority: NotificationPriority.MEDIUM,
        data: {
          changedFields: [{ field: 'title', oldValue: 123, newValue: 'b' }],
        },
        metadata: {
          source: 'test',
          category: NotificationCategory.TASK,
          tags: [],
          version: '1',
        },
      };
      expect(factory.validateNotification(notification)).toBe(false);
    });

    it('should return false for task.updated when newValue is not a string', () => {
      const notification: Partial<StructuredNotification> = {
        userId: 1,
        type: NotificationType.TASK_UPDATED,
        priority: NotificationPriority.MEDIUM,
        data: {
          changedFields: [{ field: 'title', oldValue: 'a', newValue: 456 }],
        },
        metadata: {
          source: 'test',
          category: NotificationCategory.TASK,
          tags: [],
          version: '1',
        },
      };
      expect(factory.validateNotification(notification)).toBe(false);
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
          newStatus: 'in_progress',
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
  });

  describe('hasStrategy', () => {
    it('should return false for unknown event type', () => {
      expect(factory.hasStrategy('unknown.event')).toBe(false);
    });
  });
});
