import { StructuredNotificationEntity } from '../../src/modules/notification/entities/notification.entity';
import { StructuredNotification, NotificationType, NotificationPriority } from '../../src/modules/notification/interfaces/notification.types';

describe('StructuredNotificationEntity', () => {
  let entity: StructuredNotificationEntity;

  const mockNotification: StructuredNotification = {
    id: 1,
    userId: 1,
    type: NotificationType.TASK_CREATED,
    priority: NotificationPriority.MEDIUM,
    data: {
      actorName: 'Test User',
      taskTitle: 'Test Task'
    },
    metadata: {
      source: 'test',
      category: 'task' as any,
      tags: ['test'],
      version: '1.0'
    },
    isRead: false,
    createdAt: new Date(),
  };

  beforeEach(() => {
    entity = new StructuredNotificationEntity();
  });

  describe('toDomain', () => {
    it('should convert entity to domain object correctly', () => {
      entity.id = 1;
      entity.userId = 1;
      entity.type = NotificationType.TASK_CREATED;
      entity.priority = NotificationPriority.MEDIUM;
      entity.data = {
        actorName: 'Test User',
        taskTitle: 'Test Task'
      };
      entity.metadata = {
        source: 'test',
        category: 'task' as any,
        tags: ['test'],
        version: '1.0'
      };
      entity.isRead = false;
      entity.createdAt = new Date();

      const result = entity.toDomain();

      expect(result).toEqual(mockNotification);
    });

    it('should throw error when data is invalid', () => {
      entity.id = 1;
      entity.data = null as any;

      expect(() => entity.toDomain()).toThrow('Invalid notification data for notification 1');
    });

    it('should throw error when data is not an object', () => {
      entity.id = 1;
      entity.data = 'invalid' as any;

      expect(() => entity.toDomain()).toThrow('Invalid notification data for notification 1');
    });

    it('should throw error when metadata is invalid', () => {
      entity.id = 1;
      entity.data = {};
      entity.metadata = null as any;

      expect(() => entity.toDomain()).toThrow('Invalid notification metadata for notification 1');
    });

    it('should throw error when metadata is not an object', () => {
      entity.id = 1;
      entity.data = {};
      entity.metadata = 'invalid' as any;

      expect(() => entity.toDomain()).toThrow('Invalid notification metadata for notification 1');
    });

    it('should handle optional fields correctly', () => {
      entity.id = 1;
      entity.userId = 1;
      entity.type = NotificationType.TASK_CREATED;
      entity.priority = NotificationPriority.MEDIUM;
      entity.data = {
        actorName: 'Test User',
        taskTitle: 'Test Task'
      };
      entity.metadata = {
        source: 'test',
        category: 'task' as any,
        tags: ['test'],
        version: '1.0'
      };
      entity.isRead = false;
      entity.createdAt = new Date();
      entity.expiresAt = new Date();
      entity.deliveredAt = new Date();
      entity.readAt = new Date();

      const result = entity.toDomain();

      expect(result.expiresAt).toBeDefined();
      expect(result.deliveredAt).toBeDefined();
      expect(result.readAt).toBeDefined();
    });
  });

  describe('fromDomain', () => {
    it('should create entity from domain object correctly', () => {
      const result = StructuredNotificationEntity.fromDomain(mockNotification);

      expect(result.id).toBe(mockNotification.id);
      expect(result.userId).toBe(mockNotification.userId);
      expect(result.type).toBe(mockNotification.type);
      expect(result.priority).toBe(mockNotification.priority);
      expect(result.data).toEqual(mockNotification.data);
      expect(result.metadata).toEqual(mockNotification.metadata);
      expect(result.isRead).toBe(mockNotification.isRead);
      expect(result.createdAt).toBe(mockNotification.createdAt);
    });

    it('should not set id when domain id is 0', () => {
      const notificationWithZeroId = { ...mockNotification, id: 0 };

      const result = StructuredNotificationEntity.fromDomain(notificationWithZeroId);

      expect(result.id).toBeUndefined();
    });

    it('should not set id when domain id is negative', () => {
      const notificationWithNegativeId = { ...mockNotification, id: -1 };

      const result = StructuredNotificationEntity.fromDomain(notificationWithNegativeId);

      expect(result.id).toBeUndefined();
    });

    it('should set id when domain id is positive', () => {
      const notificationWithPositiveId = { ...mockNotification, id: 42 };

      const result = StructuredNotificationEntity.fromDomain(notificationWithPositiveId);

      expect(result.id).toBe(42);
    });

    it('should handle optional fields', () => {
      const notificationWithOptions = {
        ...mockNotification,
        expiresAt: new Date(),
        deliveredAt: new Date(),
        readAt: new Date(),
      };

      const result = StructuredNotificationEntity.fromDomain(notificationWithOptions);

      expect(result.expiresAt).toBe(notificationWithOptions.expiresAt);
      expect(result.deliveredAt).toBe(notificationWithOptions.deliveredAt);
      expect(result.readAt).toBe(notificationWithOptions.readAt);
    });

    it('should handle null optional fields', () => {
      const notificationWithNullOptions = {
        ...mockNotification,
        expiresAt: null,
        deliveredAt: null,
        readAt: null,
      };

      const result = StructuredNotificationEntity.fromDomain(notificationWithNullOptions);

      expect(result.expiresAt).toBeNull();
      expect(result.deliveredAt).toBeNull();
      expect(result.readAt).toBeNull();
    });

    it('should handle undefined optional fields', () => {
      const notificationWithUndefinedOptions = {
        ...mockNotification,
        expiresAt: undefined,
        deliveredAt: undefined,
        readAt: undefined,
      };

      const result = StructuredNotificationEntity.fromDomain(notificationWithUndefinedOptions);

      expect(result.expiresAt).toBeUndefined();
      expect(result.deliveredAt).toBeUndefined();
      expect(result.readAt).toBeUndefined();
    });
  });

  describe('entity creation and properties', () => {
    it('should create entity instance', () => {
      const newEntity = new StructuredNotificationEntity();

      expect(newEntity).toBeDefined();
      expect(newEntity.id).toBeUndefined();
      expect(newEntity.userId).toBeUndefined();
      expect(newEntity.type).toBeUndefined();
      expect(newEntity.priority).toBeUndefined();
      expect(newEntity.data).toBeUndefined();
      expect(newEntity.metadata).toBeUndefined();
      expect(newEntity.isRead).toBeUndefined();
      expect(newEntity.createdAt).toBeUndefined();
    });

    it('should allow property assignment', () => {
      const newEntity = new StructuredNotificationEntity();

      newEntity.id = 1;
      newEntity.userId = 1;
      newEntity.type = NotificationType.TASK_CREATED;
      newEntity.priority = NotificationPriority.MEDIUM;
      newEntity.data = { test: 'data' };
      newEntity.metadata = { source: 'test' };
      newEntity.isRead = false;
      newEntity.createdAt = new Date();

      expect(newEntity.id).toBe(1);
      expect(newEntity.userId).toBe(1);
      expect(newEntity.type).toBe(NotificationType.TASK_CREATED);
      expect(newEntity.priority).toBe(NotificationPriority.MEDIUM);
      expect(newEntity.data).toEqual({ test: 'data' });
      expect(newEntity.metadata).toEqual({ source: 'test' });
      expect(newEntity.isRead).toBe(false);
      expect(newEntity.createdAt).toBeInstanceOf(Date);
    });
  });
});