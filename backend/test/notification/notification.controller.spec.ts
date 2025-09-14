import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from '../../src/modules/notification/controllers/notification.controller';
import { NotificationService } from '../../src/modules/notification/services/notification.service';
import { DebugLoggerService } from '../../src/modules/notification/services/debug-logger.service';
import { JwtService } from '@nestjs/jwt';
import { StructuredNotification, NotificationPagination } from '../../src/modules/notification/interfaces/notification.types';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { NotificationQueryDto } from '../../src/modules/notification/dto/notification-query.dto';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: jest.Mocked<NotificationService>;
  let jwtService: jest.Mocked<JwtService>;
  let debugLoggerService: jest.Mocked<DebugLoggerService>;

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

  const mockPagination: NotificationPagination = {
    items: [mockNotification],
    total: 1,
    page: 1,
    pageSize: 20,
    hasNext: false,
    hasPrevious: false,
  };

  const mockPayload = {
    sub: 1,
    email: 'test@example.com',
    iat: 1234567890,
    exp: 1234567890 + 3600
  };

  beforeEach(async () => {
    service = {
      findByUser: jest.fn(),
      getUnreadCount: jest.fn(),
      getUserStats: jest.fn(),
      findById: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      delete: jest.fn(),
      searchNotifications: jest.fn(),
      deleteExpired: jest.fn(),
      cleanupOldNotifications: jest.fn(),
    } as any;

    jwtService = {
      verify: jest.fn(),
    } as any;

    debugLoggerService = {
      logNotificationEvent: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: service },
        { provide: JwtService, useValue: jwtService },
        { provide: DebugLoggerService, useValue: debugLoggerService },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  describe('getUserNotifications', () => {
    const authorization = 'Bearer valid.token';
    const options: NotificationQueryDto = { limit: 10, offset: 0 };

    it('should return user notifications with valid token', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      service.findByUser.mockResolvedValue(mockPagination);

      const result = await controller.getUserNotifications({} as any, options, authorization);

      expect(jwtService.verify).toHaveBeenCalledWith('valid.token');
      expect(service.findByUser).toHaveBeenCalledWith(mockPayload.sub, options);
      expect(debugLoggerService.logNotificationEvent).toHaveBeenCalledWith(
        'notifications_list_requested',
        { options },
        mockPayload.sub
      );
      expect(debugLoggerService.logNotificationEvent).toHaveBeenCalledWith(
        'notifications_list_returned',
        { total: mockPagination.total, page: mockPagination.page, pageSize: mockPagination.pageSize },
        mockPayload.sub
      );
      expect(result).toEqual(mockPagination);
    });

    it('should throw UnauthorizedException when no authorization header', async () => {
      await expect(
        controller.getUserNotifications({} as any, options, '')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when invalid Bearer format', async () => {
      await expect(
        controller.getUserNotifications({} as any, options, 'Invalid token')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        controller.getUserNotifications({} as any, options, authorization)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should use default options when not provided', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      service.findByUser.mockResolvedValue(mockPagination);

      await controller.getUserNotifications({} as any, {} as NotificationQueryDto, authorization);

      expect(service.findByUser).toHaveBeenCalledWith(mockPayload.sub, {});
    });
  });

  describe('getUnreadCount', () => {
    const authorization = 'Bearer valid.token';

    it('should return unread count', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      service.getUnreadCount.mockResolvedValue(5);

      const result = await controller.getUnreadCount(authorization);

      expect(result).toEqual({ count: 5 });
      expect(service.getUnreadCount).toHaveBeenCalledWith(mockPayload.sub);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(controller.getUnreadCount(authorization)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getUserStats', () => {
    const authorization = 'Bearer valid.token';
    const mockStats = {
      total: 10,
      unread: 5,
      byType: { 'task.created': 3, 'comment.created': 2 },
      byPriority: { 'high': 2, 'medium': 3 }
    };

    it('should return user stats', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      service.getUserStats.mockResolvedValue(mockStats);

      const result = await controller.getUserStats(authorization);

      expect(result).toEqual(mockStats);
      expect(service.getUserStats).toHaveBeenCalledWith(mockPayload.sub);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(controller.getUserStats(authorization)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getNotificationById', () => {
    const authorization = 'Bearer valid.token';
    const notificationId = 1;

    it('should return notification by id', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      service.findById.mockResolvedValue(mockNotification);

      const result = await controller.getNotificationById(notificationId, authorization);

      expect(result).toEqual(mockNotification);
      expect(service.findById).toHaveBeenCalledWith(notificationId, mockPayload.sub);
    });

    it('should throw NotFoundException when notification not found', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      service.findById.mockResolvedValue(null);

      await expect(controller.getNotificationById(notificationId, authorization))
        .rejects.toThrow('Notification not found');
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(controller.getNotificationById(notificationId, authorization))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('markAsRead', () => {
    const authorization = 'Bearer valid.token';
    const notificationId = 1;

    it('should mark notification as read', async () => {
      jwtService.verify.mockReturnValue(mockPayload);

      await controller.markAsRead(notificationId, authorization);

      expect(service.markAsRead).toHaveBeenCalledWith(notificationId, mockPayload.sub);
      expect(debugLoggerService.logNotificationEvent).toHaveBeenCalledWith(
        'notification_marked_as_read',
        { id: notificationId },
        mockPayload.sub
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(controller.markAsRead(notificationId, authorization))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('markAllAsRead', () => {
    const authorization = 'Bearer valid.token';

    it('should mark all notifications as read', async () => {
      jwtService.verify.mockReturnValue(mockPayload);

      await controller.markAllAsRead(authorization);

      expect(service.markAllAsRead).toHaveBeenCalledWith(mockPayload.sub);
      expect(debugLoggerService.logNotificationEvent).toHaveBeenCalledWith(
        'notifications_marked_all_read',
        {},
        mockPayload.sub
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(controller.markAllAsRead(authorization))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('deleteNotification', () => {
    const authorization = 'Bearer valid.token';
    const notificationId = 1;

    it('should delete notification', async () => {
      jwtService.verify.mockReturnValue(mockPayload);

      await controller.deleteNotification(notificationId, authorization);

      expect(service.delete).toHaveBeenCalledWith(notificationId, mockPayload.sub);
      expect(debugLoggerService.logNotificationEvent).toHaveBeenCalledWith(
        'notification_deleted',
        { id: notificationId },
        mockPayload.sub
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(controller.deleteNotification(notificationId, authorization))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('searchNotifications', () => {
    const authorization = 'Bearer valid.token';
    const searchTerm = 'test';
    const options: NotificationQueryDto = { limit: 10 };

    it('should search notifications', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      service.searchNotifications.mockResolvedValue(mockPagination);

      const result = await controller.searchNotifications(searchTerm, options, authorization);

      expect(result).toEqual(mockPagination);
      expect(service.searchNotifications).toHaveBeenCalledWith(mockPayload.sub, searchTerm, options);
    });

    it('should use default options when not provided', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      service.searchNotifications.mockResolvedValue(mockPagination);

      await controller.searchNotifications(searchTerm, {} as NotificationQueryDto, authorization);

      expect(service.searchNotifications).toHaveBeenCalledWith(mockPayload.sub, searchTerm, {});
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(controller.searchNotifications(searchTerm, options, authorization))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Admin Endpoints', () => {
    describe('cleanupExpired', () => {
      it('should cleanup expired notifications', async () => {
        await controller.cleanupExpired();

        expect(service.deleteExpired).toHaveBeenCalled();
      });
    });

    describe('cleanupOldNotifications', () => {
      const daysToKeep = 30;
      const deletedCount = 10;

      it('should cleanup old notifications', async () => {
        service.cleanupOldNotifications.mockResolvedValue(deletedCount);

        const result = await controller.cleanupOldNotifications(daysToKeep);

        expect(result).toEqual({
          message: 'Old notifications cleaned up successfully',
          deletedCount
        });
        expect(service.cleanupOldNotifications).toHaveBeenCalledWith(daysToKeep);
      });

      it('should use default daysToKeep when not provided', async () => {
        service.cleanupOldNotifications.mockResolvedValue(deletedCount);

        await controller.cleanupOldNotifications();

        expect(service.cleanupOldNotifications).toHaveBeenCalledWith(90);
      });
    });
  });
});