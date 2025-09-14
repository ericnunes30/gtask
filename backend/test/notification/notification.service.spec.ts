import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../../src/modules/notification/services/notification.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StructuredNotificationEntity } from '../../src/modules/notification/entities/notification.entity';
import { NotificationFactory } from '../../src/modules/notification/factories/notification.factory';
import { DebugLoggerService } from '../../src/modules/notification/services/debug-logger.service';
import { StructuredNotification, NotificationQueryOptions, NotificationPagination } from '../../src/modules/notification/interfaces/notification.types';
import { Logger } from '@nestjs/common';

jest.mock('../../src/modules/notification/entities/notification.entity');

describe('NotificationService', () => {
  let service: NotificationService;
  let repository: jest.Mocked<Repository<StructuredNotificationEntity>>;
  let factory: jest.Mocked<NotificationFactory>;
  let debugLogger: jest.Mocked<DebugLoggerService>;
  let logger: jest.Mocked<Logger>;

  const mockNotification: StructuredNotification = {
    id: 1,
    userId: 1,
    type: 'task.created' as any,
    priority: 'medium' as any,
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

  const mockEntity = {
    id: 1,
    userId: 1,
    type: 'task.created',
    priority: 'medium',
    data: {
      actorName: 'Test User',
      taskTitle: 'Test Task'
    },
    metadata: {
      source: 'test',
      category: 'task',
      tags: ['test'],
      version: '1.0'
    },
    isRead: false,
    createdAt: new Date(),
    toDomain: jest.fn().mockReturnValue(mockNotification),
  } as any;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    } as any;

    factory = {
      validateNotification: jest.fn(),
    } as any;

    debugLogger = {
      logNotificationEvent: jest.fn(),
      logError: jest.fn(),
    } as any;

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(StructuredNotificationEntity),
          useValue: repository,
        },
        {
          provide: NotificationFactory,
          useValue: factory,
        },
        {
          provide: DebugLoggerService,
          useValue: debugLogger,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    (service as any).logger = logger;
  });

  describe('create', () => {
    it('should create notification successfully', async () => {
      const notificationToCreate = { ...mockNotification };
      delete notificationToCreate.id;
      
      factory.validateNotification.mockReturnValue(true);
      repository.save.mockResolvedValue(mockEntity);

      const result = await service.create(notificationToCreate);

      expect(factory.validateNotification).toHaveBeenCalledWith(notificationToCreate);
      expect(repository.save).toHaveBeenCalled();
      expect(debugLogger.logNotificationEvent).toHaveBeenCalledWith(
        'notification_created',
        {
          id: mockNotification.id,
          userId: notificationToCreate.userId,
          type: notificationToCreate.type,
          priority: notificationToCreate.priority
        },
        notificationToCreate.userId
      );
      expect(result).toEqual(mockNotification);
    });

    it('should throw error when notification validation fails', async () => {
      const notificationToCreate = { ...mockNotification };
      delete notificationToCreate.id;
      
      factory.validateNotification.mockReturnValue(false);

      await expect(service.create(notificationToCreate)).rejects.toThrow('Invalid notification data');
    });

    it('should handle repository save errors', async () => {
      const notificationToCreate = { ...mockNotification };
      delete notificationToCreate.id;
      
      factory.validateNotification.mockReturnValue(true);
      repository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(notificationToCreate)).rejects.toThrow('Database error');
      expect(debugLogger.logError).toHaveBeenCalledWith(
        expect.any(Error),
        `Notification creation failed for user ${notificationToCreate.userId}`
      );
    });
  });

  describe('findById', () => {
    const notificationId = 1;
    const userId = 1;

    it('should return notification when found', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockEntity),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findById(notificationId, userId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('notification.id = :id', { id: notificationId });
      if (userId) {
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('notification.userId = :userId', { userId });
      }
      expect(result).toEqual(mockNotification);
    });

    it('should return null when notification not found', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findById(notificationId, userId);

      expect(result).toBeNull();
    });

    it('should search without userId filter when userId not provided', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockEntity),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findById(notificationId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('notification.id = :id', { id: notificationId });
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('findByUser', () => {
    const userId = 1;
    const options: NotificationQueryOptions = { limit: 10, offset: 0, unreadOnly: true };
    const mockItems = [mockEntity];
    const mockTotal = 1;

    beforeEach(() => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockItems, mockTotal]),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
    });

    it('should return paginated notifications', async () => {
      const result = await service.findByUser(userId, options);

      expect(result).toEqual({
        items: [mockNotification],
        total: mockTotal,
        page: 1,
        pageSize: options.limit,
        hasNext: false,
        hasPrevious: false,
      });
      expect(debugLogger.logNotificationEvent).toHaveBeenCalledWith(
        'notifications_query_start',
        { options },
        userId
      );
      expect(debugLogger.logNotificationEvent).toHaveBeenCalledWith(
        'notifications_query_end',
        { total: mockTotal, page: 1, pageSize: options.limit },
        userId
      );
    });

    it('should use default options when not provided', async () => {
      await service.findByUser(userId);

      expect(repository.createQueryBuilder().take).toHaveBeenCalledWith(20);
      expect(repository.createQueryBuilder().skip).toHaveBeenCalledWith(0);
    });

    it('should apply filters correctly', async () => {
      const complexOptions: NotificationQueryOptions = {
        unreadOnly: true,
        types: ['task.created' as any, 'comment.created' as any],
        priorities: ['high' as any],
        categories: ['task' as any],
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        limit: 5,
        offset: 10,
      };

      await service.findByUser(userId, complexOptions);

      const queryBuilder = repository.createQueryBuilder();
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('notification.isRead = false');
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('notification.type IN (:...types)', { types: complexOptions.types });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('notification.priority IN (:...priorities)', { priorities: complexOptions.priorities });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "notification.metadata->>'category' IN (:...categories)",
        { categories: complexOptions.categories }
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('notification.createdAt >= :startDate', { startDate: complexOptions.startDate });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('notification.createdAt <= :endDate', { endDate: complexOptions.endDate });
    });
  });

  describe('markAsRead', () => {
    const notificationId = 1;
    const userId = 1;

    it('should mark notification as read', async () => {
      await service.markAsRead(notificationId, userId);

      expect(repository.update).toHaveBeenCalledWith(
        { id: notificationId, userId },
        { isRead: true, readAt: expect.any(Date) }
      );
      expect(debugLogger.logNotificationEvent).toHaveBeenCalledWith(
        'notification_marked_as_read',
        { id: notificationId },
        userId
      );
    });
  });

  describe('markAllAsRead', () => {
    const userId = 1;

    it('should mark all unread notifications as read', async () => {
      await service.markAllAsRead(userId);

      expect(repository.update).toHaveBeenCalledWith(
        { userId, isRead: false },
        { isRead: true, readAt: expect.any(Date) }
      );
      expect(debugLogger.logNotificationEvent).toHaveBeenCalledWith(
        'notifications_marked_all_read',
        {},
        userId
      );
    });
  });

  describe('delete', () => {
    const notificationId = 1;
    const userId = 1;

    it('should delete notification', async () => {
      await service.delete(notificationId, userId);

      expect(repository.delete).toHaveBeenCalledWith({ id: notificationId, userId });
      expect(debugLogger.logNotificationEvent).toHaveBeenCalledWith(
        'notification_deleted',
        { id: notificationId },
        userId
      );
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired notifications', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.deleteExpired();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('expiresAt < :now', { now: expect.any(Date) });
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
      expect(debugLogger.logNotificationEvent).toHaveBeenCalledWith(
        'notifications_deleted_expired',
        {},
        0
      );
    });
  });

  describe('getUnreadCount', () => {
    const userId = 1;
    const mockCount = 5;

    it('should return unread notification count', async () => {
      repository.count.mockResolvedValue(mockCount);

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(mockCount);
      expect(repository.count).toHaveBeenCalledWith({
        where: { userId, isRead: false }
      });
    });
  });

  describe('getUserStats', () => {
    const userId = 1;
    const mockStats = {
      total: 10,
      unread: 5,
      byType: [
        { type: 'task.created', count: '3' },
        { type: 'comment.created', count: '2' }
      ],
      byPriority: [
        { priority: 'high', count: '2' },
        { priority: 'medium', count: '3' }
      ]
    };

    it('should return user statistics', async () => {
      repository.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);

      const mockQueryBuilder = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn()
      });

      repository.createQueryBuilder
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue(mockStats.byType)
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue(mockStats.byPriority)
        });

      const result = await service.getUserStats(userId);

      expect(result).toEqual({
        total: 10,
        unread: 5,
        byType: {
          'task.created': 3,
          'comment.created': 2
        },
        byPriority: {
          'high': 2,
          'medium': 3
        }
      });
    });
  });

  describe('cleanupOldNotifications', () => {
    const daysToKeep = 30;
    const mockDeletedCount = 10;

    it('should clean up old notifications', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: mockDeletedCount }),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.cleanupOldNotifications(daysToKeep);

      expect(result).toBe(mockDeletedCount);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('createdAt < :cutoffDate', { cutoffDate: expect.any(Date) });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('isRead = true');
      expect(debugLogger.logNotificationEvent).toHaveBeenCalledWith(
        'notifications_cleanup_old',
        { daysToKeep, deleted: mockDeletedCount },
        0
      );
    });

    it('should use default daysToKeep when not provided', async () => {
      repository.createQueryBuilder.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      } as any);

      await service.cleanupOldNotifications();

      expect(repository.createQueryBuilder().where).toHaveBeenCalledWith(
        'createdAt < :cutoffDate',
        { cutoffDate: expect.any(Date) }
      );
    });
  });

  describe('searchNotifications', () => {
    const userId = 1;
    const searchTerm = 'test';
    const options: NotificationQueryOptions = { limit: 10 };

    it('should search notifications using findByUser', async () => {
      const mockPagination: NotificationPagination = {
        items: [mockNotification],
        total: 1,
        page: 1,
        pageSize: 10,
        hasNext: false,
        hasPrevious: false,
      };

      jest.spyOn(service, 'findByUser').mockResolvedValue(mockPagination);

      const result = await service.searchNotifications(userId, searchTerm, options);

      expect(service.findByUser).toHaveBeenCalledWith(userId, options);
      expect(result).toEqual(mockPagination);
    });

    it('should handle search errors', async () => {
      jest.spyOn(service, 'findByUser').mockRejectedValue(new Error('Search error'));

      await expect(service.searchNotifications(userId, searchTerm, options))
        .rejects.toThrow('Search error');
    });
  });
});