import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from '../../src/modules/events/gateways/events.gateway';
import { NotificationService } from '../../src/modules/notification/services/notification.service';
import { DebugLoggerService } from '../../src/modules/notification/services/debug-logger.service';
import { TimerService } from '../../src/modules/tasks/services/timer.service';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { Comment } from '../../src/modules/comment/entities/comment.entity';

describe('EventsGateway - Notification Handlers', () => {
  let gateway: EventsGateway;
  let notificationService: jest.Mocked<NotificationService>;
  let debugLogger: jest.Mocked<DebugLoggerService>;

  beforeEach(async () => {
    const mockNotificationService = {
      create: jest.fn(),
    };
    
    const mockDebugLogger = {
      logNotificationEvent: jest.fn(),
      logWebSocketEvent: jest.fn(),
    };

    const mockTimerService = {
      start: jest.fn(),
      pause: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        { provide: StructuredNotificationService, useValue: mockNotificationService },
        { provide: DebugLoggerService, useValue: mockDebugLogger },
        { provide: TimerService, useValue: mockTimerService },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    notificationService = mockNotificationService as jest.Mocked<NotificationService>;
    debugLogger = mockDebugLogger as jest.Mocked<DebugLoggerService>;

    // Mock the server property
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;
  });

  describe('handleTaskCreatedEvent', () => {
    it('should create notifications for task users', async () => {
      const payload = {
        task: {
          id: 1,
          title: 'Test Task',
          users: [{ id: 2 }, { id: 3 }],
          project: { users: [{ id: 4 }] },
        } as Task,
        createdBy: 1,
      };

      const mockNotification = { id: 1, userId: 2, message: 'Test notification' };
      notificationService.create.mockResolvedValue(mockNotification as any);

      await gateway.handleTaskCreatedEvent(payload);

      expect(notificationService.create).toHaveBeenCalledTimes(3);
      expect(debugLogger.logNotificationEvent).toHaveBeenCalledWith(
        'task.created',
        payload,
        1
      );
    });

    it('should not create notifications for the user who created the task', async () => {
      const payload = {
        task: {
          id: 1,
          title: 'Test Task',
          users: [{ id: 1 }, { id: 2 }],
          project: { users: [{ id: 1 }] },
        } as Task,
        createdBy: 1,
      };

      const mockNotification = { id: 1, userId: 2, message: 'Test notification' };
      notificationService.create.mockResolvedValue(mockNotification as any);

      await gateway.handleTaskCreatedEvent(payload);

      expect(notificationService.create).toHaveBeenCalledTimes(1);
      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 2 })
      );
    });
  });

  describe('handleTaskStatusUpdatedEvent', () => {
    it('should create notifications for status updates', async () => {
      const payload = {
        task: {
          id: 1,
          title: 'Test Task',
          users: [{ id: 2 }],
          project: { users: [{ id: 3 }] },
        } as Task,
        updatedBy: 1,
        oldStatus: 'pendente',
        newStatus: 'em_andamento',
      };

      const mockNotification = { id: 1, userId: 2, message: 'Test notification' };
      notificationService.create.mockResolvedValue(mockNotification as any);

      await gateway.handleTaskStatusUpdatedEvent(payload);

      expect(notificationService.create).toHaveBeenCalledTimes(2);
      expect(debugLogger.logNotificationEvent).toHaveBeenCalledWith(
        'task.status.updated',
        payload,
        1
      );
    });

    it('should include status change in notification message', async () => {
      const payload = {
        task: {
          id: 1,
          title: 'Test Task',
          users: [{ id: 2 }],
        } as Task,
        updatedBy: 1,
        oldStatus: 'pendente',
        newStatus: 'em_andamento',
      };

      const mockNotification = { id: 1, userId: 2, message: 'Test notification' };
      notificationService.create.mockResolvedValue(mockNotification as any);

      await gateway.handleTaskStatusUpdatedEvent(payload);

      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('pendente'),
          link: '/tasks/1',
        })
      );
    });
  });

  describe('handleCommentCreatedEvent', () => {
    it('should create notifications for comment creation', async () => {
      const payload = {
        comment: {
          id: 1,
          task_id: 1,
          task: {
            id: 1,
            title: 'Test Task',
            users: [{ id: 2 }],
            project: { users: [{ id: 3 }] },
          } as Task,
        } as Comment,
        createdBy: 1,
      };

      const mockNotification = { id: 1, userId: 2, message: 'Test notification' };
      notificationService.create.mockResolvedValue(mockNotification as any);

      await gateway.handleCommentCreatedEvent(payload);

      expect(notificationService.create).toHaveBeenCalledTimes(2);
      expect(debugLogger.logNotificationEvent).toHaveBeenCalledWith(
        'comment.created',
        payload,
        1
      );
    });

    it('should include comment link in notification', async () => {
      const payload = {
        comment: {
          id: 1,
          task_id: 1,
          task: {
            id: 1,
            title: 'Test Task',
            users: [{ id: 2 }],
          } as Task,
        } as Comment,
        createdBy: 1,
      };

      const mockNotification = { id: 1, userId: 2, message: 'Test notification' };
      notificationService.create.mockResolvedValue(mockNotification as any);

      await gateway.handleCommentCreatedEvent(payload);

      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          link: '/tasks/1#comment-1',
        })
      );
    });
  });

  describe('handleTaskUpdatedEvent', () => {
    it('should create notifications for task updates', async () => {
      const payload = {
        task: {
          id: 1,
          title: 'Test Task',
          users: [{ id: 2 }],
          project: { users: [{ id: 3 }] },
        } as Task,
        updatedBy: 1,
        changedFields: {
          title: { oldValue: 'Old Title', newValue: 'New Title' },
          description: { oldValue: 'Old Desc', newValue: 'New Desc' },
        },
      };

      const mockNotification = { id: 1, userId: 2, message: 'Test notification' };
      notificationService.create.mockResolvedValue(mockNotification as any);

      await gateway.handleTaskUpdatedEvent(payload);

      expect(notificationService.create).toHaveBeenCalledTimes(2);
      expect(debugLogger.logNotificationEvent).toHaveBeenCalledWith(
        'task.updated',
        payload,
        1
      );
    });

    it('should include changed fields in notification message', async () => {
      const payload = {
        task: {
          id: 1,
          title: 'Test Task',
          users: [{ id: 2 }],
        } as Task,
        updatedBy: 1,
        changedFields: {
          title: { oldValue: 'Old Title', newValue: 'New Title' },
        },
      };

      const mockNotification = { id: 1, userId: 2, message: 'Test notification' };
      notificationService.create.mockResolvedValue(mockNotification as any);

      await gateway.handleTaskUpdatedEvent(payload);

      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('title: Old Title → New Title'),
        })
      );
    });
  });

  describe('WebSocket Connection Handling', () => {
    it('should log WebSocket connections', () => {
      const mockClient = {
        id: 'client-1',
        user: { sub: 1 },
        join: jest.fn(),
      } as any;

      gateway.handleConnection(mockClient);

      expect(debugLogger.logWebSocketEvent).toHaveBeenCalledWith(
        'connection',
        'client-1',
        { userId: 1 }
      );
      expect(mockClient.join).toHaveBeenCalledWith('user_1');
    });

    it('should handle unauthorized connections', () => {
      const mockClient = {
        id: 'client-1',
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(mockClient);

      expect(debugLogger.logWebSocketEvent).toHaveBeenCalledWith(
        'unauthorized_connection',
        'client-1'
      );
      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });
});;
  });
});