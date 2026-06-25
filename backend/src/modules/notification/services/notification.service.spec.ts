import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { NotificationService } from './notification.service';
import { StructuredNotificationEntity } from '../entities/notification.entity';
import { NotificationFactory } from '../factories/notification.factory';
import { DebugLoggerService } from './debug-logger.service';
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
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
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
});
