import { Test, type TestingModule } from '@nestjs/testing';
import {
  type INestApplication,
  type CanActivate,
  HttpStatus,
  type ExecutionContext,
} from '@nestjs/common';
import request from 'supertest';
import { NotificationController } from './notification.controller';
import { NotificationService } from '../services/notification.service';
import { DebugLoggerService } from '../services/debug-logger.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  type StructuredNotification,
  type NotificationPagination,
  NotificationType,
  NotificationPriority,
  NotificationCategory,
} from '../interfaces/notification.types';

const mockUser: Express.User = {
  sub: 1,
  email: 'test@example.com',
  name: 'Test User',
};

const mockJwtAuthGuard: CanActivate = {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = mockUser;
    return true;
  },
};

const mockNotificationPagination: NotificationPagination = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  hasNext: false,
  hasPrevious: false,
};

const mockNotification: StructuredNotification = {
  id: 1,
  userId: 1,
  type: NotificationType.TASK_CREATED,
  priority: NotificationPriority.MEDIUM,
  data: {
    entityType: 'task',
    entityId: 1,
    action: 'created',
  },
  metadata: {
    source: 'test',
    category: NotificationCategory.TASK,
    tags: [],
    version: '1.0',
  },
  isRead: false,
  createdAt: new Date(),
};

describe('NotificationController', () => {
  let app: INestApplication;
  let notificationService: jest.Mocked<NotificationService>;

  beforeAll(async () => {
    notificationService = {
      findByUser: jest.fn(),
      getUnreadCount: jest.fn(),
      getUserStats: jest.fn(),
      findById: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      delete: jest.fn(),
      deleteExpired: jest.fn(),
      cleanupOldNotifications: jest.fn(),
      searchNotifications: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<NotificationService>;

    const debugLoggerMock = {
      logNotificationEvent: jest.fn(),
      logWebSocketEvent: jest.fn(),
      logError: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: notificationService },
        { provide: DebugLoggerService, useValue: debugLoggerMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /notifications', () => {
    it('should return 200 with paginated notifications', async () => {
      notificationService.findByUser.mockResolvedValue(
        mockNotificationPagination,
      );

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        ...mockNotificationPagination,
        items: mockNotificationPagination.items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
      });
      expect(notificationService.findByUser).toHaveBeenCalledWith(
        mockUser.sub,
        expect.any(Object),
      );
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('should return 200 with unread count', async () => {
      notificationService.getUnreadCount.mockResolvedValue(5);

      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ count: 5 });
      expect(notificationService.getUnreadCount).toHaveBeenCalledWith(
        mockUser.sub,
      );
    });
  });

  describe('GET /notifications/stats', () => {
    it('should return 200 with user stats', async () => {
      const stats = { total: 10, unread: 3, byType: {}, byPriority: {} };
      notificationService.getUserStats.mockResolvedValue(stats);

      const response = await request(app.getHttpServer())
        .get('/notifications/stats')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(stats);
      expect(notificationService.getUserStats).toHaveBeenCalledWith(
        mockUser.sub,
      );
    });
  });

  describe('GET /notifications/:id', () => {
    it('should return 200 with notification', async () => {
      notificationService.findById.mockResolvedValue(mockNotification);

      const response = await request(app.getHttpServer())
        .get('/notifications/1')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        ...mockNotification,
        createdAt: mockNotification.createdAt.toISOString(),
      });
      expect(notificationService.findById).toHaveBeenCalledWith(
        1,
        mockUser.sub,
      );
    });

    it('should return 404 when notification not found', async () => {
      notificationService.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/notifications/999')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('PUT /notifications/:id/read', () => {
    it('should return 200', async () => {
      notificationService.markAsRead.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .put('/notifications/1/read')
        .expect(HttpStatus.OK);

      expect(notificationService.markAsRead).toHaveBeenCalledWith(
        1,
        mockUser.sub,
      );
    });
  });

  describe('PUT /notifications/read-all', () => {
    it('should return 200', async () => {
      notificationService.markAllAsRead.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .put('/notifications/read-all')
        .expect(HttpStatus.OK);

      expect(notificationService.markAllAsRead).toHaveBeenCalledWith(
        mockUser.sub,
      );
    });
  });

  describe('DELETE /notifications/:id', () => {
    it('should return 200', async () => {
      notificationService.delete.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/notifications/1')
        .expect(HttpStatus.OK);

      expect(notificationService.delete).toHaveBeenCalledWith(1, mockUser.sub);
    });
  });

  describe('GET /notifications/search', () => {
    it('should return 200 with search results', async () => {
      notificationService.searchNotifications.mockResolvedValue(
        mockNotificationPagination,
      );

      const response = await request(app.getHttpServer())
        .get('/notifications/search')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        ...mockNotificationPagination,
        items: mockNotificationPagination.items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
      });
      expect(notificationService.searchNotifications).toHaveBeenCalledWith(
        mockUser.sub,
        undefined,
        expect.any(Object),
      );
    });
  });

  describe('GET /notifications/admin/cleanup', () => {
    it('should return 200 with cleanup message', async () => {
      notificationService.deleteExpired.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .get('/notifications/admin/cleanup')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        message: 'Expired notifications cleaned up successfully',
      });
      expect(notificationService.deleteExpired).toHaveBeenCalled();
    });
  });

  describe('POST /notifications/admin/cleanup-old', () => {
    it('should return 200 with deleted count', async () => {
      notificationService.cleanupOldNotifications.mockResolvedValue(42);

      const response = await request(app.getHttpServer())
        .post('/notifications/admin/cleanup-old')
        .send({ daysToKeep: 30 })
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual({
        message: 'Old notifications cleaned up successfully',
        deletedCount: 42,
      });
      expect(notificationService.cleanupOldNotifications).toHaveBeenCalledWith(
        30,
      );
    });
  });

  describe('Error paths and edge cases', () => {
    it('should return 400 when notification id is not numeric (GET /:id)', async () => {
      await request(app.getHttpServer())
        .get('/notifications/abc')
        .expect(HttpStatus.BAD_REQUEST);

      expect(notificationService.findById).not.toHaveBeenCalled();
    });

    it('should return 400 when notification id is not numeric (PUT /:id/read)', async () => {
      await request(app.getHttpServer())
        .put('/notifications/abc/read')
        .expect(HttpStatus.BAD_REQUEST);

      expect(notificationService.markAsRead).not.toHaveBeenCalled();
    });

    it('should return 400 when notification id is not numeric (DELETE /:id)', async () => {
      await request(app.getHttpServer())
        .delete('/notifications/abc')
        .expect(HttpStatus.BAD_REQUEST);

      expect(notificationService.delete).not.toHaveBeenCalled();
    });

    it('should pass searchTerm to searchNotifications when q query param is provided', async () => {
      notificationService.searchNotifications.mockResolvedValue(
        mockNotificationPagination,
      );

      await request(app.getHttpServer())
        .get('/notifications/search?q=task')
        .expect(HttpStatus.OK);

      expect(notificationService.searchNotifications).toHaveBeenCalledWith(
        mockUser.sub,
        'task',
        expect.any(Object),
      );
    });

    it('should use default daysToKeep=90 when body omits daysToKeep', async () => {
      notificationService.cleanupOldNotifications.mockResolvedValue(10);

      const response = await request(app.getHttpServer())
        .post('/notifications/admin/cleanup-old')
        .send({})
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual({
        message: 'Old notifications cleaned up successfully',
        deletedCount: 10,
      });
      expect(notificationService.cleanupOldNotifications).toHaveBeenCalledWith(
        90,
      );
    });

    it('should accept pagination query params on GET /notifications', async () => {
      notificationService.findByUser.mockResolvedValue(
        mockNotificationPagination,
      );

      await request(app.getHttpServer())
        .get('/notifications?page=2&pageSize=10&isRead=false')
        .expect(HttpStatus.OK);

      expect(notificationService.findByUser).toHaveBeenCalledWith(
        mockUser.sub,
        expect.objectContaining({ page: '2', pageSize: '10' }),
      );
    });

    it('should propagate service error from findByUser as 500', async () => {
      notificationService.findByUser.mockRejectedValue(new Error('DB error'));

      await request(app.getHttpServer())
        .get('/notifications')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should propagate service error from markAsRead as 500', async () => {
      notificationService.markAsRead.mockRejectedValue(new Error('fail'));

      await request(app.getHttpServer())
        .put('/notifications/1/read')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
