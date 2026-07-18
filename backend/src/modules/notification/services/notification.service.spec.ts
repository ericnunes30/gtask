import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { NotificationService } from './notification.service';
import { StructuredNotificationEntity } from '../entities/notification.entity';
import { NotificationFactory } from '../factories/notification.factory';
import { DebugLoggerService } from './debug-logger.service';
import { NotificationNotFoundException } from '../exceptions/notification-not-found.exception';
import {
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  StructuredNotification,
} from '../interfaces/notification.types';

function createMockQueryBuilder() {
  const chainable = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  };
  return chainable;
}

type MockRepository<T> = jest.Mocked<Repository<T>>;

function createMockRepository<T>(): MockRepository<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
  } as unknown as MockRepository<T>;
}

describe('NotificationService', () => {
  let service: NotificationService;
  let repository: MockRepository<StructuredNotificationEntity>;
  let notificationFactory: {
    validateNotification: jest.Mock;
  };
  let debugLogger: {
    logNotificationEvent: jest.Mock;
    logError: jest.Mock;
  };

  const mockNotification: StructuredNotification = {
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
  };

  beforeEach(async () => {
    repository = createMockRepository<StructuredNotificationEntity>();
    notificationFactory = {
      validateNotification: jest.fn().mockReturnValue(true),
    };
    debugLogger = {
      logNotificationEvent: jest.fn(),
      logError: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(StructuredNotificationEntity),
          useValue: repository,
        },
        { provide: NotificationFactory, useValue: notificationFactory },
        { provide: DebugLoggerService, useValue: debugLogger },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a valid notification', async () => {
      const entity = StructuredNotificationEntity.fromDomain(mockNotification);
      repository.save.mockResolvedValue(entity);

      const result = await service.create(mockNotification);

      expect(result.userId).toBe(mockNotification.userId);
      expect(result.type).toBe(mockNotification.type);
      expect(notificationFactory.validateNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: mockNotification.userId }),
      );
    });

    it('should throw when notification data is invalid', async () => {
      notificationFactory.validateNotification.mockReturnValue(false);

      await expect(service.create(mockNotification)).rejects.toThrow(
        'Invalid notification data',
      );
    });

    it('should propagate errors and log them when repository.save fails', async () => {
      repository.save.mockRejectedValue(new Error('db constraint'));

      await expect(service.create(mockNotification)).rejects.toThrow(
        'db constraint',
      );
      expect(debugLogger.logError).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return notification when found', async () => {
      const entity = StructuredNotificationEntity.fromDomain(mockNotification);
      repository.createQueryBuilder.mockReturnValue({
        ...createMockQueryBuilder(),
        getOne: jest.fn().mockResolvedValue(entity),
      });

      const result = await service.findById(1);

      expect(result?.userId).toBe(mockNotification.userId);
    });

    it('should return null when not found', async () => {
      repository.createQueryBuilder.mockReturnValue(createMockQueryBuilder());

      const result = await service.findById(999);

      expect(result).toBeNull();
    });

    it('should not add userId filter when not provided', async () => {
      const qb = createMockQueryBuilder();
      repository.createQueryBuilder.mockReturnValue(qb);

      await service.findById(1);

      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('should filter by userId when provided', async () => {
      const entity = StructuredNotificationEntity.fromDomain(mockNotification);
      const qb = createMockQueryBuilder();
      qb.getOne = jest.fn().mockResolvedValue(entity);
      repository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findById(1, 1);

      expect(result?.userId).toBe(mockNotification.userId);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'notification.userId = :userId',
        { userId: 1 },
      );
    });
  });

  describe('findByUser', () => {
    it('should return paginated notifications with default options', async () => {
      const entity1 = StructuredNotificationEntity.fromDomain(mockNotification);
      const entity2 = StructuredNotificationEntity.fromDomain({
        ...mockNotification,
        id: 2,
      });

      const qb = createMockQueryBuilder();
      qb.getManyAndCount = jest.fn().mockResolvedValue([[entity1, entity2], 2]);
      repository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByUser(1);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrevious).toBe(false);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(qb.skip).toHaveBeenCalledWith(0);
    });

    it('should return paginated notifications with custom options', async () => {
      const entity = StructuredNotificationEntity.fromDomain(mockNotification);

      const qb = createMockQueryBuilder();
      qb.getManyAndCount = jest.fn().mockResolvedValue([[entity], 50]);
      repository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByUser(1, { limit: 10, offset: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(50);
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(true);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(qb.skip).toHaveBeenCalledWith(20);
    });
  });

  describe('markAsRead', () => {
    it('should update notification as read', async () => {
      repository.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      await service.markAsRead(1, 1);

      expect(repository.update).toHaveBeenCalledWith(
        { id: 1, userId: 1 },
        { isRead: true, readAt: expect.any(Date) },
      );
    });

    it('should throw NotificationNotFoundException when notification does not exist', async () => {
      repository.update.mockResolvedValue({
        affected: 0,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      await expect(service.markAsRead(999, 1)).rejects.toThrow(
        NotificationNotFoundException,
      );
    });

    it('should propagate error when repository.update rejects', async () => {
      repository.update.mockRejectedValue(new Error('db connection lost'));

      await expect(service.markAsRead(1, 1)).rejects.toThrow(
        'db connection lost',
      );
      expect(debugLogger.logNotificationEvent).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications for user', async () => {
      repository.update.mockResolvedValue({
        affected: 5,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      await service.markAllAsRead(1);

      expect(repository.update).toHaveBeenCalledWith(
        { userId: 1, isRead: false },
        { isRead: true, readAt: expect.any(Date) },
      );
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      repository.delete.mockResolvedValue({ affected: 1, raw: [] });

      await service.delete(1, 1);

      expect(repository.delete).toHaveBeenCalledWith({ id: 1, userId: 1 });
    });

    it('should throw NotificationNotFoundException when notification does not exist', async () => {
      repository.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.delete(999, 1)).rejects.toThrow(
        NotificationNotFoundException,
      );
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired notifications', async () => {
      const qb = createMockQueryBuilder();
      qb.execute = jest.fn().mockResolvedValue({ affected: 5 });
      repository.createQueryBuilder.mockReturnValue(qb);

      await service.deleteExpired();

      expect(repository.createQueryBuilder).toHaveBeenCalled();
      expect(qb.delete).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith('expiresAt < :now', {
        now: expect.any(Date),
      });
      expect(qb.execute).toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      repository.count.mockResolvedValue(3);

      const result = await service.getUnreadCount(1);

      expect(result).toBe(3);
      expect(repository.count).toHaveBeenCalledWith({
        where: { userId: 1, isRead: false },
      });
    });
  });

  describe('getUserStats', () => {
    it('should return total, unread, byType and byPriority stats', async () => {
      repository.count.mockResolvedValueOnce(10).mockResolvedValueOnce(3);

      const typeQueryBuilder = {
        ...createMockQueryBuilder(),
        getRawMany: jest.fn().mockResolvedValue([
          { type: 'TASK_CREATED', count: '5' },
          { type: 'TASK_ASSIGNED', count: '2' },
        ]),
      };

      const priorityQueryBuilder = {
        ...createMockQueryBuilder(),
        getRawMany: jest.fn().mockResolvedValue([
          { priority: 'HIGH', count: '3' },
          { priority: 'MEDIUM', count: '4' },
        ]),
      };

      repository.createQueryBuilder
        .mockReturnValueOnce(typeQueryBuilder)
        .mockReturnValueOnce(priorityQueryBuilder);

      const result = await service.getUserStats(1);

      expect(result.total).toBe(10);
      expect(result.unread).toBe(3);
      expect(result.byType).toEqual({
        TASK_CREATED: 5,
        TASK_ASSIGNED: 2,
      });
      expect(result.byPriority).toEqual({
        HIGH: 3,
        MEDIUM: 4,
      });
    });

    it('should handle rows with missing type/priority in stats', async () => {
      repository.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const typeQueryBuilder = {
        ...createMockQueryBuilder(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ type: undefined, count: '5' }]),
      };

      const priorityQueryBuilder = {
        ...createMockQueryBuilder(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ priority: undefined, count: '3' }]),
      };

      repository.createQueryBuilder
        .mockReturnValueOnce(typeQueryBuilder)
        .mockReturnValueOnce(priorityQueryBuilder);

      const result = await service.getUserStats(1);

      expect(result.byType['']).toBe(5);
      expect(result.byPriority['']).toBe(3);
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should delete old read notifications and return deleted count', async () => {
      const qb = createMockQueryBuilder();
      qb.execute = jest.fn().mockResolvedValue({ affected: 10 });
      repository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.cleanupOldNotifications(30);

      expect(qb.delete).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith('createdAt < :cutoffDate', {
        cutoffDate: expect.any(Date),
      });
      expect(qb.andWhere).toHaveBeenCalledWith('isRead = true');
      expect(qb.execute).toHaveBeenCalled();
      expect(result).toBe(10);
    });

    it('should use default daysToKeep and return 0 when nothing affected', async () => {
      const qb = createMockQueryBuilder();
      qb.execute = jest.fn().mockResolvedValue({ affected: 0 });
      repository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.cleanupOldNotifications();

      expect(qb.where).toHaveBeenCalledWith('createdAt < :cutoffDate', {
        cutoffDate: expect.any(Date),
      });
      expect(qb.andWhere).toHaveBeenCalledWith('isRead = true');
      expect(result).toBe(0);
    });

    it('should return 0 when affected is undefined', async () => {
      const qb = createMockQueryBuilder();
      qb.execute = jest.fn().mockResolvedValue({});
      repository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.cleanupOldNotifications();

      expect(result).toBe(0);
    });
  });

  describe('searchNotifications', () => {
    it('should delegate to findByUser', async () => {
      const entity = StructuredNotificationEntity.fromDomain(mockNotification);
      const qb = createMockQueryBuilder();
      qb.getManyAndCount = jest.fn().mockResolvedValue([[entity], 1]);
      repository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.searchNotifications(1, 'search term', {
        limit: 10,
        offset: 0,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(qb.where).toHaveBeenCalledWith('notification.userId = :userId', {
        userId: 1,
      });
    });

    it('should use default options when none provided', async () => {
      const entity = StructuredNotificationEntity.fromDomain(mockNotification);
      const qb = createMockQueryBuilder();
      qb.getManyAndCount = jest.fn().mockResolvedValue([[entity], 1]);
      repository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.searchNotifications(1, 'term');

      expect(result.items).toHaveLength(1);
      expect(result.pageSize).toBe(20);
      expect(result.page).toBe(1);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(qb.skip).toHaveBeenCalledWith(0);
    });
  });
});
