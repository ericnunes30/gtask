import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../../src/modules/notification/services/notification.service';
import { NotificationController } from '../../src/modules/notification/controllers/notification.controller';
import { NotificationFactory } from '../../src/modules/notification/factories/notification.factory';
import { StructuredNotificationEntity } from '../../src/modules/notification/entities/notification.entity';
import { 
  StructuredNotification, 
  NotificationType, 
  NotificationPriority,
  NotificationCategory
} from '../../src/modules/notification/interfaces/notification.types';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Logger } from '@nestjs/common';

describe('Notification Error Handling and Edge Cases', () => {
  let notificationService: NotificationService;
  let notificationController: NotificationController;
  let notificationFactory: NotificationFactory;
  let repository: jest.Mocked<Repository<StructuredNotificationEntity>>;

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
      category: NotificationCategory.TASK,
      tags: ['test'],
      version: '1.0'
    },
    isRead: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
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
          useValue: {
            validateNotification: jest.fn(),
          },
        },
        {
          provide: 'DebugLoggerService',
          useValue: {
            logNotificationEvent: jest.fn(),
            logError: jest.fn(),
          },
        },
      ],
    }).compile();

    notificationService = module.get<NotificationService>(NotificationService);
    (notificationService as any).logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const controllerModule: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: notificationService,
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
        {
          provide: 'DebugLoggerService',
          useValue: {
            logNotificationEvent: jest.fn(),
            logError: jest.fn(),
          },
        },
      ],
    }).compile();

    notificationController = controllerModule.get<NotificationController>(NotificationController);

    notificationFactory = module.get<NotificationFactory>(NotificationFactory);
  });

  describe('Service Error Handling', () => {
    describe('create method', () => {
      it('should throw error when validation fails', async () => {
        const invalidNotification = { ...mockNotification };
        delete (invalidNotification as any).userId;
        
        (notificationFactory.validateNotification as jest.Mock).mockReturnValue(false);

        await expect(notificationService.create(invalidNotification as any))
          .rejects.toThrow('Invalid notification data');
      });

      it('should handle repository save errors', async () => {
        const validNotification = { ...mockNotification };
        delete validNotification.id;
        
        (notificationFactory.validateNotification as jest.Mock).mockReturnValue(true);
        repository.save.mockRejectedValue(new Error('Database connection failed'));

        await expect(notificationService.create(validNotification))
          .rejects.toThrow('Database connection failed');
      });

      it('should handle repository save errors with non-Error objects', async () => {
        const validNotification = { ...mockNotification };
        delete validNotification.id;
        
        (notificationFactory.validateNotification as jest.Mock).mockReturnValue(true);
        repository.save.mockRejectedValue('String error');

        await expect(notificationService.create(validNotification))
          .rejects.toThrow('String error');
      });

      it('should log error when notification creation fails', async () => {
        const validNotification = { ...mockNotification };
        delete validNotification.id;
        const error = new Error('Database error');
        
        (notificationFactory.validateNotification as jest.Mock).mockReturnValue(true);
        repository.save.mockRejectedValue(error);

        try {
          await notificationService.create(validNotification);
        } catch (e) {
          // Ignore error, just test logging
        }

        expect((notificationService as any).logger.error).toHaveBeenCalledWith(
          `Failed to create notification for user ${validNotification.userId}:`,
          error
        );
      });
    });

    describe('findById method', () => {
      it('should handle database query errors', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockRejectedValue(new Error('Query timeout')),
        };

        repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(notificationService.findById(1, 1))
          .rejects.toThrow('Query timeout');
      });
    });

    describe('findByUser method', () => {
      it('should handle empty result set', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };

        repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        const result = await notificationService.findByUser(1, {});

        expect(result.items).toEqual([]);
        expect(result.total).toBe(0);
        expect(result.hasNext).toBe(false);
        expect(result.hasPrevious).toBe(false);
      });

      it('should handle large offset values', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };

        repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(notificationService.findByUser(1, { offset: 999999 }))
          .resolves.not.toThrow();
      });

      it('should handle negative limit values', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };

        repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(notificationService.findByUser(1, { limit: -1 }))
          .resolves.not.toThrow();
      });
    });

    describe('deleteExpired method', () => {
      it('should handle empty expired notifications', async () => {
        const mockQueryBuilder = {
          delete: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 0 }),
        };

        repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(notificationService.deleteExpired())
          .resolves.not.toThrow();
      });
    });

    describe('cleanupOldNotifications method', () => {
      it('should handle negative daysToKeep', async () => {
        const mockQueryBuilder = {
          delete: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 0 }),
        };

        repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(notificationService.cleanupOldNotifications(-10))
          .resolves.toBe(0);
      });

      it('should handle very large daysToKeep', async () => {
        const mockQueryBuilder = {
          delete: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 0 }),
        };

        repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(notificationService.cleanupOldNotifications(36500))
          .resolves.toBe(0);
      });
    });
  });

  describe('Controller Error Handling', () => {
    describe('getUserNotifications', () => {
      it('should handle malformed authorization header', async () => {
        await expect(
          notificationController.getUserNotifications({} as any, {}, 'Bearer malformed')
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should handle missing authorization header', async () => {
        await expect(
          notificationController.getUserNotifications({} as any, {}, '')
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should handle JWT verification errors', async () => {
        const jwtService = (notificationController as any).jwtService;
        jwtService.verify.mockImplementation(() => {
          throw new Error('Token expired');
        });

        await expect(
          notificationController.getUserNotifications({} as any, {}, 'Bearer valid.token')
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should handle service errors gracefully', async () => {
        const jwtService = (notificationController as any).jwtService;
        jwtService.verify.mockReturnValue({ sub: 1 });
        
        jest.spyOn(notificationService, 'findByUser')
          .mockRejectedValue(new Error('Service unavailable'));

        await expect(
          notificationController.getUserNotifications({} as any, {}, 'Bearer valid.token')
        ).rejects.toThrow('Service unavailable');
      });
    });

    describe('markAsRead method', () => {
      it('should handle JWT verification errors', async () => {
        const jwtService = (notificationController as any).jwtService;
        jwtService.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });

        await expect(
          notificationController.markAsRead(1, 'Bearer valid.token')
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should handle service errors', async () => {
        const jwtService = (notificationController as any).jwtService;
        jwtService.verify.mockReturnValue({ sub: 1 });
        
        jest.spyOn(notificationService, 'markAsRead')
          .mockRejectedValue(new Error('Database error'));

        await expect(
          notificationController.markAsRead(1, 'Bearer valid.token')
        ).rejects.toThrow('Database error');
      });
    });

    describe('deleteNotification method', () => {
      it('should handle non-existent notification', async () => {
        const jwtService = (notificationController as any).jwtService;
        jwtService.verify.mockReturnValue({ sub: 1 });
        
        jest.spyOn(notificationService, 'delete')
          .mockRejectedValue(new Error('Notification not found'));

        await expect(
          notificationController.deleteNotification(999, 'Bearer valid.token')
        ).rejects.toThrow('Notification not found');
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    describe('Very large notification IDs', () => {
      it('should handle maximum integer values', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        };

        repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(notificationService.findById(2147483647, 1))
          .resolves.toBeNull();
      });

      it('should handle zero notification ID', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        };

        repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(notificationService.findById(0, 1))
          .resolves.toBeNull();
      });
    });

    describe('User ID edge cases', () => {
      it('should handle zero user ID', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        };

        repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(notificationService.findById(1, 0))
          .resolves.toBeNull();
      });

      it('should handle negative user ID', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        };

        repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(notificationService.findById(1, -1))
          .resolves.toBeNull();
      });
    });

    describe('Date handling edge cases', () => {
      it('should handle very old dates', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };

        repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(notificationService.findByUser(1, {
          startDate: '1970-01-01T00:00:00Z',
          endDate: '1970-01-02T00:00:00Z'
        })).resolves.not.toThrow();
      });

      it('should handle future dates', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };

        repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 100);

        await expect(notificationService.findByUser(1, {
          startDate: futureDate.toISOString(),
          endDate: futureDate.toISOString()
        })).resolves.not.toThrow();
      });
    });

    describe('Large data sets', () => {
      it('should handle very large limit values', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };

        repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(notificationService.findByUser(1, { limit: 1000000 }))
          .resolves.not.toThrow();
      });

      it('should handle very large offset values', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };

        repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(notificationService.findByUser(1, { offset: 1000000 }))
          .resolves.not.toThrow();
      });
    });

    describe('Invalid input types', () => {
      it('should handle non-string authorization header', async () => {
        await expect(
          notificationController.getUserNotifications({} as any, {}, 123 as any)
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should handle non-number notification ID in controller', async () => {
        const jwtService = (notificationController as any).jwtService;
        jwtService.verify.mockReturnValue({ sub: 1 });

        await expect(
          notificationController.getNotificationById('invalid' as any, 'Bearer valid.token')
        ).rejects.toThrow();
      });
    });

    describe('Memory and performance edge cases', () => {
      it('should handle very long search terms', async () => {
        const longSearchTerm = 'a'.repeat(10000);
        
        jest.spyOn(notificationService, 'searchNotifications')
          .mockResolvedValue({
            items: [],
            total: 0,
            page: 1,
            pageSize: 20,
            hasNext: false,
            hasPrevious: false,
          });

        const jwtService = (notificationController as any).jwtService;
        jwtService.verify.mockReturnValue({ sub: 1 });

        await expect(
          notificationController.searchNotifications(longSearchTerm, {}, 'Bearer valid.token')
        ).resolves.not.toThrow();
      });

      it('should handle very large arrays in filters', async () => {
        const largeTypesArray = Array(1000).fill(NotificationType.TASK_CREATED);
        
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };

        repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(notificationService.findByUser(1, { types: largeTypesArray as any }))
          .resolves.not.toThrow();
      });
    });
  });

  describe('Concurrency and Race Conditions', () => {
    it('should handle concurrent notification creation', async () => {
      const validNotification = { ...mockNotification };
      delete validNotification.id;
      
      (notificationFactory.validateNotification as jest.Mock).mockReturnValue(true);
      
      // Simulate slow database operation
      repository.save.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockNotification), 100);
        });
      });

      const promises = Array(5).fill(null).map(() => 
        notificationService.create(validNotification)
      );

      const results = await Promise.allSettled(promises);
      
      // All should either succeed or fail gracefully
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });

    it('should handle concurrent read operations', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const promises = Array(10).fill(null).map(() => 
        notificationService.findByUser(1, {})
      );

      const results = await Promise.allSettled(promises);
      
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });
});