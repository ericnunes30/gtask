import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from '../../src/modules/events/gateways/events.gateway';
import { NotificationService } from '../../src/modules/notification/services/notification.service';
import { NotificationFactory } from '../../src/modules/notification/factories/notification.factory';
import { DebugLoggerService } from '../../src/modules/notification/services/debug-logger.service';
import { TimerService } from '../../src/modules/tasks/services/timer.service';
import { UserService } from '../../src/modules/user/services/user.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { Comment } from '../../src/modules/comment/entities/comment.entity';
import { mockTaskFactory, mockUserFactory, mockCommentFactory } from '../mocks/factory';

describe('EventsGateway - Notification Handlers', () => {
  let gateway: EventsGateway;
  let notificationService: jest.Mocked<NotificationService>;
  let notificationFactory: jest.Mocked<NotificationFactory>;
  let debugLoggerService: jest.Mocked<DebugLoggerService>;
  let timerService: jest.Mocked<TimerService>;
  let userService: jest.Mocked<UserService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let mockServer: jest.Mocked<Server>;

  beforeEach(async () => {
    notificationService = {
      create: jest.fn(),
    } as any;

    notificationFactory = {
      hasStrategy: jest.fn(),
      getRegisteredEvents: jest.fn(),
      create: jest.fn(),
    } as any;

    debugLoggerService = {
      logWebSocketEvent: jest.fn(),
      logNotificationEvent: jest.fn(),
    } as any;

    timerService = {
      start: jest.fn(),
      pause: jest.fn(),
    } as any;

    userService = {
      findOne: jest.fn(),
    } as any;

    eventEmitter = {
      on: jest.fn(),
      emit: jest.fn(),
    } as any;

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        { provide: NotificationService, useValue: notificationService },
        { provide: NotificationFactory, useValue: notificationFactory },
        { provide: DebugLoggerService, useValue: debugLoggerService },
        { provide: TimerService, useValue: timerService },
        { provide: UserService, useValue: userService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    gateway.server = mockServer;
    (gateway as any).isInitialized = true;
  });

  describe('handleEvent method', () => {
    it('should handle event with notification strategy', async () => {
      const eventName = 'test.event';
      const payload = { id: 1, createdBy: 1 };
      const mockUsers = [2, 3];
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);
      userService.findOne.mockResolvedValue(mockUser);

      await (gateway as any).handleEvent(eventName, payload, () => mockUsers);

      expect(notificationFactory.hasStrategy).toHaveBeenCalledWith(eventName);
      expect(userService.findOne).toHaveBeenCalledWith(1);
      expect(notificationFactory.create).toHaveBeenCalledWith(eventName, expect.objectContaining({
        ...payload,
        performer: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com'
        }
      }));
      expect(notificationService.create).toHaveBeenCalledTimes(2);
      expect(mockServer.to).toHaveBeenCalledWith('user_2');
      expect(mockServer.emit).toHaveBeenCalledWith('new_structured_notification', { id: 1, userId: 2 });
    });

    it('should skip event when no notification strategy exists', async () => {
      const eventName = 'nonexistent.event';
      const payload = { id: 1 };

      notificationFactory.hasStrategy.mockReturnValue(false);
      notificationFactory.getRegisteredEvents.mockReturnValue(['test.event', 'other.event']);

      await (gateway as any).handleEvent(eventName, payload, () => [1, 2]);

      expect(notificationFactory.hasStrategy).toHaveBeenCalledWith(eventName);
      expect(notificationFactory.create).not.toHaveBeenCalled();
      expect(notificationService.create).not.toHaveBeenCalled();
    });

    it('should skip when no users to notify', async () => {
      const eventName = 'test.event';
      const payload = { id: 1 };

      notificationFactory.hasStrategy.mockReturnValue(true);

      await (gateway as any).handleEvent(eventName, payload, () => []);

      expect(notificationFactory.create).not.toHaveBeenCalled();
      expect(notificationService.create).not.toHaveBeenCalled();
    });

    it('should handle user enrichment errors gracefully', async () => {
      const eventName = 'test.event';
      const payload = { id: 1, createdBy: 1 };
      const mockUsers = [2];

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);
      userService.findOne.mockRejectedValue(new Error('User not found'));

      await (gateway as any).handleEvent(eventName, payload, () => mockUsers);

      expect(notificationFactory.create).toHaveBeenCalledWith(eventName, payload);
    });

    it('should handle notification creation errors gracefully', async () => {
      const eventName = 'test.event';
      const payload = { id: 1, createdBy: 1 };
      const mockUsers = [2];

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockRejectedValue(new Error('Notification failed'));

      await (gateway as any).handleEvent(eventName, payload, () => mockUsers);

      expect(notificationFactory.create).toHaveBeenCalled();
      expect(notificationService.create).toHaveBeenCalled();
    });

    it('should handle cases where performer ID is not available', async () => {
      const eventName = 'test.event';
      const payload = { id: 1 };
      const mockUsers = [2];

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);

      await (gateway as any).handleEvent(eventName, payload, () => mockUsers);

      expect(notificationFactory.create).toHaveBeenCalledWith(eventName, payload);
    });

    it('should handle performer ID from different payload fields', async () => {
      const eventName = 'test.event';
      const payload = { id: 1, userId: 1 };
      const mockUsers = [2];
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);
      userService.findOne.mockResolvedValue(mockUser);

      await (gateway as any).handleEvent(eventName, payload, () => mockUsers);

      expect(userService.findOne).toHaveBeenCalledWith(1);
      expect(notificationFactory.create).toHaveBeenCalledWith(eventName, expect.objectContaining({
        ...payload,
        performer: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com'
        }
      }));
    });
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

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);

      await gateway.handleTaskCreatedEvent(payload);

      expect(notificationFactory.create).toHaveBeenCalledWith('task.created', expect.any(Object));
      expect(notificationService.create).toHaveBeenCalledTimes(3);
      expect(debugLoggerService.logNotificationEvent).toHaveBeenCalledWith(
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

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);

      await gateway.handleTaskCreatedEvent(payload);

      expect(notificationService.create).toHaveBeenCalledTimes(1);
      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 2 })
      );
    });

    it('should handle task without users', async () => {
      const payload = {
        task: {
          id: 1,
          title: 'Test Task',
          users: [],
          project: { users: [{ id: 2 }] },
        } as Task,
        createdBy: 1,
      };

      notificationFactory.hasStrategy.mockReturnValue(true);

      await gateway.handleTaskCreatedEvent(payload);

      expect(notificationFactory.create).toHaveBeenCalled();
      expect(notificationService.create).toHaveBeenCalled();
    });

    it('should handle task without project', async () => {
      const payload = {
        task: {
          id: 1,
          title: 'Test Task',
          users: [{ id: 2 }],
          project: null,
        } as Task,
        createdBy: 1,
      };

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);

      await gateway.handleTaskCreatedEvent(payload);

      expect(notificationFactory.create).toHaveBeenCalled();
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

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);

      await gateway.handleTaskStatusUpdatedEvent(payload);

      expect(notificationFactory.create).toHaveBeenCalledWith('task.status.changed', expect.any(Object));
      expect(notificationService.create).toHaveBeenCalledTimes(2);
      expect(debugLoggerService.logNotificationEvent).toHaveBeenCalledWith(
        'task.status.changed',
        payload,
        1
      );
    });

    it('should notify only reviewer when status changes to review', async () => {
      const payload = {
        task: {
          id: 1,
          title: 'Test Task',
          users: [{ id: 2 }],
          project: { users: [{ id: 3 }] },
          reviewer: { id: 4 },
        } as Task,
        updatedBy: 1,
        oldStatus: 'em_andamento',
        newStatus: 'em_revisao',
      };

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 4, message: 'Review requested' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 4 } as any);

      await gateway.handleTaskStatusUpdatedEvent(payload);

      expect(notificationService.create).toHaveBeenCalledTimes(1);
      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 4 })
      );
    });

    it('should not notify when reviewer is the same as updater', async () => {
      const payload = {
        task: {
          id: 1,
          title: 'Test Task',
          users: [{ id: 2 }],
          project: { users: [{ id: 3 }] },
          reviewer: { id: 1 },
        } as Task,
        updatedBy: 1,
        oldStatus: 'em_andamento',
        newStatus: 'em_revisao',
      };

      notificationFactory.hasStrategy.mockReturnValue(true);

      await gateway.handleTaskStatusUpdatedEvent(payload);

      expect(notificationService.create).not.toHaveBeenCalled();
      expect(notificationService.create).not.toHaveBeenCalled();
    });

    it('should handle task without reviewer when status changes to review', async () => {
      const payload = {
        task: {
          id: 1,
          title: 'Test Task',
          users: [{ id: 2 }],
          project: { users: [{ id: 3 }] },
          reviewer: null,
          task_reviewer_id: null,
        } as Task,
        updatedBy: 1,
        oldStatus: 'em_andamento',
        newStatus: 'em_revisao',
      };

      notificationFactory.hasStrategy.mockReturnValue(true);

      await gateway.handleTaskStatusUpdatedEvent(payload);

      expect(notificationService.create).not.toHaveBeenCalled();
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

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);

      await gateway.handleCommentCreatedEvent(payload);

      expect(notificationFactory.create).toHaveBeenCalledWith('comment.created', expect.any(Object));
      expect(notificationService.create).toHaveBeenCalledTimes(2);
      expect(debugLoggerService.logNotificationEvent).toHaveBeenCalledWith(
        'comment.created',
        payload,
        1
      );
    });

    it('should skip if gateway not initialized', async () => {
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

      (gateway as any).isInitialized = false;
      const loggerWarnSpy = jest.spyOn((gateway as any).logger, 'warn');

      await gateway.handleCommentCreatedEvent(payload);

      expect(loggerWarnSpy).toHaveBeenCalledWith('⚠️  EventsGateway not fully initialized, skipping comment.created event');
      expect(notificationFactory.create).not.toHaveBeenCalled();
      expect(notificationService.create).not.toHaveBeenCalled();
    });

    it('should handle comment without task users', async () => {
      const payload = {
        comment: {
          id: 1,
          task_id: 1,
          task: {
            id: 1,
            title: 'Test Task',
            users: [],
            project: { users: [{ id: 2 }] },
          } as Task,
        } as Comment,
        createdBy: 1,
      };

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);

      await gateway.handleCommentCreatedEvent(payload);

      expect(notificationFactory.create).toHaveBeenCalled();
      expect(notificationService.create).toHaveBeenCalled();
    });

    it('should handle comment without task project', async () => {
      const payload = {
        comment: {
          id: 1,
          task_id: 1,
          task: {
            id: 1,
            title: 'Test Task',
            users: [{ id: 2 }],
            project: null,
          } as Task,
        } as Comment,
        createdBy: 1,
      };

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);

      await gateway.handleCommentCreatedEvent(payload);

      expect(notificationFactory.create).toHaveBeenCalled();
      expect(notificationService.create).toHaveBeenCalled();
    });

    it('should not notify comment author', async () => {
      const payload = {
        comment: {
          id: 1,
          task_id: 1,
          task: {
            id: 1,
            title: 'Test Task',
            users: [{ id: 1 }],
            project: { users: [{ id: 1 }] },
          } as Task,
        } as Comment,
        createdBy: 1,
      };

      notificationFactory.hasStrategy.mockReturnValue(true);

      await gateway.handleCommentCreatedEvent(payload);

      expect(notificationService.create).not.toHaveBeenCalled();
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

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);

      await gateway.handleTaskUpdatedEvent(payload);

      expect(notificationFactory.create).toHaveBeenCalledWith('task.updated', expect.any(Object));
      expect(notificationService.create).toHaveBeenCalledTimes(2);
      expect(debugLoggerService.logNotificationEvent).toHaveBeenCalledWith(
        'task.updated',
        payload,
        1
      );
    });

    it('should handle task without project', async () => {
      const payload = {
        task: {
          id: 1,
          title: 'Test Task',
          users: [{ id: 2 }],
          project: null,
        } as Task,
        updatedBy: 1,
        changedFields: {
          title: { oldValue: 'Old Title', newValue: 'New Title' },
        },
      };

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);

      await gateway.handleTaskUpdatedEvent(payload);

      expect(notificationFactory.create).toHaveBeenCalled();
      expect(notificationService.create).toHaveBeenCalled();
    });

    it('should handle task without users', async () => {
      const payload = {
        task: {
          id: 1,
          title: 'Test Task',
          users: [],
          project: { users: [{ id: 2 }] },
        } as Task,
        updatedBy: 1,
        changedFields: {
          title: { oldValue: 'Old Title', newValue: 'New Title' },
        },
      };

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);

      await gateway.handleTaskUpdatedEvent(payload);

      expect(notificationFactory.create).toHaveBeenCalled();
      expect(notificationService.create).toHaveBeenCalled();
    });

    it('should not notify updater', async () => {
      const payload = {
        task: {
          id: 1,
          title: 'Test Task',
          users: [{ id: 1 }],
          project: { users: [{ id: 1 }] },
        } as Task,
        updatedBy: 1,
        changedFields: {
          title: { oldValue: 'Old Title', newValue: 'New Title' },
        },
      };

      notificationFactory.hasStrategy.mockReturnValue(true);

      await gateway.handleTaskUpdatedEvent(payload);

      expect(notificationService.create).not.toHaveBeenCalled();
    });
  });

  describe('Timer Event Handlers', () => {
    describe('handleTimerStartedEvent', () => {
      it('should broadcast timer.started event', () => {
        const payload = { taskId: 123, userId: 1 };
        const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

        gateway.handleTimerStartedEvent(payload);

        expect(loggerSpy).toHaveBeenCalledWith('Broadcasting timer.started for task 123');
        expect(mockServer.to).toHaveBeenCalledWith(`task_123`);
        expect(mockServer.emit).toHaveBeenCalledWith('timer.started', payload);
      });
    });

    describe('handleTimerPausedEvent', () => {
      it('should broadcast timer.paused event', () => {
        const payload = { taskId: 123, userId: 1, seconds: 150 };
        const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

        gateway.handleTimerPausedEvent(payload);

        expect(loggerSpy).toHaveBeenCalledWith('Broadcasting timer.paused for task 123');
        expect(mockServer.to).toHaveBeenCalledWith(`task_123`);
        expect(mockServer.emit).toHaveBeenCalledWith('timer.paused', payload);
      });
    });

    describe('handleTimerTickEvent', () => {
      it('should broadcast timer.tick event', () => {
        const payload = { taskId: 123, seconds: 150 };

        gateway.handleTimerTickEvent(payload);

        expect(mockServer.to).toHaveBeenCalledWith(`task_123`);
        expect(mockServer.emit).toHaveBeenCalledWith('timer.tick', payload);
      });
    });
  });

  describe('WebSocket Connection Handling', () => {
    it('should log WebSocket connections', () => {
      const mockClient = {
        id: 'client-1',
        user: { sub: 1 },
        join: jest.fn(),
      } as any;

      const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

      gateway.handleConnection(mockClient);

      expect(loggerSpy).toHaveBeenCalledWith('Client connected: client-1 (user 1)');
      expect(debugLoggerService.logWebSocketEvent).toHaveBeenCalledWith('connection', 'client-1', { userId: 1 });
      expect(mockClient.join).toHaveBeenCalledWith('user_1');
    });

    it('should handle unauthorized connections', () => {
      const mockClient = {
        id: 'client-1',
        disconnect: jest.fn(),
      } as any;

      const loggerWarnSpy = jest.spyOn((gateway as any).logger, 'warn');

      gateway.handleConnection(mockClient);

      expect(loggerWarnSpy).toHaveBeenCalledWith('Unauthorized WS connection: client-1');
      expect(debugLoggerService.logWebSocketEvent).toHaveBeenCalledWith('unauthorized_connection', 'client-1');
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should log client disconnections', () => {
      const mockClient = {
        id: 'client-1',
      } as any;

      const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

      gateway.handleDisconnect(mockClient);

      expect(loggerSpy).toHaveBeenCalledWith('Client disconnected: client-1');
    });
  });

  describe('Room Management', () => {
    describe('handleJoinTaskRoom', () => {
      it('should handle joining task room', () => {
        const mockClient = {
          id: 'client-1',
          join: jest.fn(),
        } as any;

        const taskId = '123';
        const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

        gateway.handleJoinTaskRoom(mockClient, taskId);

        expect(loggerSpy).toHaveBeenCalledWith('Client client-1 joining task room: 123');
        expect(mockClient.join).toHaveBeenCalledWith(`task_${taskId}`);
      });
    });

    describe('handleLeaveTaskRoom', () => {
      it('should handle leaving task room', () => {
        const mockClient = {
          id: 'client-1',
          leave: jest.fn(),
        } as any;

        const taskId = '123';
        const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

        gateway.handleLeaveTaskRoom(mockClient, taskId);

        expect(loggerSpy).toHaveBeenCalledWith('Client client-1 leaving task room: 123');
        expect(mockClient.leave).toHaveBeenCalledWith(`task_${taskId}`);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle notification service errors gracefully', async () => {
      const payload = {
        task: {
          id: 1,
          title: 'Test Task',
          users: [{ id: 2 }],
        } as Task,
        createdBy: 1,
      };

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockRejectedValue(new Error('Database error'));
      const loggerErrorSpy = jest.spyOn((gateway as any).logger, 'error');

      await gateway.handleTaskCreatedEvent(payload);

      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should handle WebSocket emit errors gracefully', async () => {
      const payload = {
        task: {
          id: 1,
          title: 'Test Task',
          users: [{ id: 2 }],
        } as Task,
        createdBy: 1,
      };

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);
      mockServer.emit.mockImplementation(() => {
        throw new Error('WebSocket error');
      });

      // Should not throw, should handle gracefully
      await expect(gateway.handleTaskCreatedEvent(payload)).resolves.not.toThrow();
    });
  });
});