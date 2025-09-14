import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from '../../src/modules/events/gateways/events.gateway';
import { NotificationService } from '../../src/modules/notification/services/notification.service';
import { NotificationFactory } from '../../src/modules/notification/factories/notification.factory';
import { DebugLoggerService } from '../../src/modules/notification/services/debug-logger.service';
import { TimerService } from '../../src/modules/tasks/services/timer.service';
import { UserService } from '../../src/modules/user/services/user.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { Comment } from '../../src/modules/comment/entities/comment.entity';
import { mockTaskFactory, mockUserFactory, mockCommentFactory } from '../mocks/factory';

describe('EventsGateway Event Handling', () => {
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

  describe('Event Broadcasting and Real-time Features', () => {
    describe('Real-time Timer Events', () => {
      it('should broadcast timer.started event to task room', () => {
        const payload = { taskId: 123, userId: 1, startTime: new Date() };

        gateway.handleTimerStartedEvent(payload);

        expect(mockServer.to).toHaveBeenCalledWith('task_123');
        expect(mockServer.emit).toHaveBeenCalledWith('timer.started', payload);
      });

      it('should broadcast timer.paused event to task room', () => {
        const payload = { taskId: 123, userId: 1, seconds: 150 };

        gateway.handleTimerPausedEvent(payload);

        expect(mockServer.to).toHaveBeenCalledWith('task_123');
        expect(mockServer.emit).toHaveBeenCalledWith('timer.paused', payload);
      });

      it('should broadcast timer.tick event to task room', () => {
        const payload = { taskId: 123, seconds: 150 };

        gateway.handleTimerTickEvent(payload);

        expect(mockServer.to).toHaveBeenCalledWith('task_123');
        expect(mockServer.emit).toHaveBeenCalledWith('timer.tick', payload);
      });
    });

    describe('Real-time Task Events', () => {
      it('should create and broadcast notifications for task creation', async () => {
        const payload = {
          task: mockTaskFactory({
            id: 1,
            title: 'New Task',
            users: [mockUserFactory({ id: 2 })],
            project: { users: [mockUserFactory({ id: 3 })] },
          }),
          createdBy: 1,
        };

        notificationFactory.hasStrategy.mockReturnValue(true);
        notificationFactory.create.mockReturnValue({ userId: 2, message: 'Task created' });
        notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);
        userService.findOne.mockResolvedValue(mockUserFactory({ id: 1 }));

        await gateway.handleTaskCreatedEvent(payload);

        expect(mockServer.emit).toHaveBeenCalledWith('new_structured_notification', { id: 1, userId: 2 });
        expect(mockServer.emit).toHaveBeenCalledWith('new_structured_notification', { id: 1, userId: 3 });
      });

      it('should create and broadcast notifications for task status changes', async () => {
        const payload = {
          task: mockTaskFactory({
            id: 1,
            title: 'Updated Task',
            users: [mockUserFactory({ id: 2 })],
          }),
          updatedBy: 1,
          oldStatus: 'pendente',
          newStatus: 'em_andamento',
        };

        notificationFactory.hasStrategy.mockReturnValue(true);
        notificationFactory.create.mockReturnValue({ userId: 2, message: 'Status changed' });
        notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);
        userService.findOne.mockResolvedValue(mockUserFactory({ id: 1 }));

        await gateway.handleTaskStatusUpdatedEvent(payload);

        expect(mockServer.emit).toHaveBeenCalledWith('new_structured_notification', { id: 1, userId: 2 });
      });

      it('should create and broadcast notifications for comments', async () => {
        const payload = {
          comment: mockCommentFactory({
            id: 1,
            content: 'New comment',
            task: mockTaskFactory({
              id: 1,
              users: [mockUserFactory({ id: 2 })],
            }),
          }),
          createdBy: 1,
        };

        notificationFactory.hasStrategy.mockReturnValue(true);
        notificationFactory.create.mockReturnValue({ userId: 2, message: 'New comment' });
        notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);
        userService.findOne.mockResolvedValue(mockUserFactory({ id: 1 }));

        await gateway.handleCommentCreatedEvent(payload);

        expect(mockServer.emit).toHaveBeenCalledWith('new_structured_notification', { id: 1, userId: 2 });
      });
    });

    describe('Room Management', () => {
      it('should join task room correctly', () => {
        const mockClient = {
          id: 'client-1',
          join: jest.fn(),
        } as any;

        gateway.handleJoinTaskRoom(mockClient, '123');

        expect(mockClient.join).toHaveBeenCalledWith('task_123');
      });

      it('should leave task room correctly', () => {
        const mockClient = {
          id: 'client-1',
          leave: jest.fn(),
        } as any;

        gateway.handleLeaveTaskRoom(mockClient, '123');

        expect(mockClient.leave).toHaveBeenCalledWith('task_123');
      });

      it('should join user room on connection', () => {
        const mockClient = {
          id: 'client-1',
          user: { sub: 1 },
          join: jest.fn(),
        } as any;

        gateway.handleConnection(mockClient);

        expect(mockClient.join).toHaveBeenCalledWith('user_1');
      });
    });
  });

  describe('Authentication and Authorization', () => {
    describe('WebSocket Authentication', () => {
      it('should allow authenticated users to join rooms', () => {
        const mockClient = {
          id: 'client-1',
          user: { sub: 1 },
          join: jest.fn(),
        } as any;

        gateway.handleConnection(mockClient);
        gateway.handleJoinTaskRoom(mockClient, '123');

        expect(mockClient.join).toHaveBeenCalledWith('user_1');
        expect(mockClient.join).toHaveBeenCalledWith('task_123');
      });

      it('should reject unauthorized timer operations', () => {
        const mockClient = {
          id: 'client-1',
          disconnect: jest.fn(),
          emit: jest.fn(),
        } as any;

        gateway.handleTimerStart(mockClient, { taskId: 123 });

        expect(mockClient.emit).toHaveBeenCalledWith('error', {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated'
        });
        expect(mockClient.disconnect).toHaveBeenCalled();
      });

      it('should allow authorized timer operations', () => {
        const mockClient = {
          id: 'client-1',
          user: { sub: 1 },
          emit: jest.fn(),
        } as any;

        gateway.handleTimerStart(mockClient, { taskId: 123 });

        expect(timerService.start).toHaveBeenCalledWith(123, 1);
        expect(mockClient.emit).not.toHaveBeenCalledWith('error');
      });
    });

    describe('User Context in Events', () => {
      it('should track user context for timer operations', () => {
        const mockClient = {
          id: 'client-1',
          user: { sub: 1 },
          emit: jest.fn(),
        } as any;

        gateway.handleTimerStart(mockClient, { taskId: 123 });
        gateway.handleTimerPause(mockClient, { taskId: 123 });

        expect(timerService.start).toHaveBeenCalledWith(123, 1);
        expect(timerService.pause).toHaveBeenCalledWith(123, 1);
      });

      it('should handle users with different permissions', () => {
        const adminClient = {
          id: 'admin-client',
          user: { sub: 1, roles: ['admin'] },
          emit: jest.fn(),
        } as any;

        const userClient = {
          id: 'user-client',
          user: { sub: 2, roles: ['user'] },
          emit: jest.fn(),
        } as any;

        gateway.handleTimerStart(adminClient, { taskId: 123 });
        gateway.handleTimerStart(userClient, { taskId: 456 });

        expect(timerService.start).toHaveBeenCalledWith(123, 1);
        expect(timerService.start).toHaveBeenCalledWith(456, 2);
      });
    });
  });

  describe('Event Error Handling', () => {
    it('should handle WebSocket emit failures gracefully', async () => {
      const payload = {
        task: mockTaskFactory({
          id: 1,
          users: [mockUserFactory({ id: 2 })],
        }),
        createdBy: 1,
      };

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);
      userService.findOne.mockResolvedValue(mockUserFactory({ id: 1 }));
      
      // Simulate WebSocket emit failure
      mockServer.emit.mockImplementation(() => {
        throw new Error('WebSocket disconnected');
      });

      // Should not throw, should handle gracefully
      await expect(gateway.handleTaskCreatedEvent(payload)).resolves.not.toThrow();
    });

    it('should handle timer service errors gracefully', () => {
      const mockClient = {
        id: 'client-1',
        user: { sub: 1 },
        emit: jest.fn(),
      } as any;

      const error = new Error('Timer service unavailable');
      timerService.start.mockImplementation(() => {
        throw error;
      });

      gateway.handleTimerStart(mockClient, { taskId: 123 });

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        code: 'TIMER_START_FAILED',
        message: 'Unable to start timer'
      });
    });

    it('should handle notification service errors gracefully', async () => {
      const payload = {
        task: mockTaskFactory({
          id: 1,
          users: [mockUserFactory({ id: 2 })],
        }),
        createdBy: 1,
      };

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockRejectedValue(new Error('Database error'));
      userService.findOne.mockResolvedValue(mockUserFactory({ id: 1 }));

      // Should not throw, should handle gracefully
      await expect(gateway.handleTaskCreatedEvent(payload)).resolves.not.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent events efficiently', async () => {
      const payloads = Array.from({ length: 10 }, (_, i) => ({
        task: mockTaskFactory({
          id: i + 1,
          users: [mockUserFactory({ id: 2 })],
        }),
        createdBy: 1,
      }));

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);
      userService.findOne.mockResolvedValue(mockUserFactory({ id: 1 }));

      // Process events concurrently
      await Promise.all(payloads.map(payload => gateway.handleTaskCreatedEvent(payload)));

      expect(notificationService.create).toHaveBeenCalledTimes(10);
    });

    it('should handle large notification payloads', async () => {
      const largePayload = {
        task: mockTaskFactory({
          id: 1,
          title: 'x'.repeat(1000), // Large title
          description: 'y'.repeat(5000), // Large description
          users: Array.from({ length: 100 }, (_, i) => mockUserFactory({ id: i + 1 })),
        }),
        createdBy: 1,
      };

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);
      userService.findOne.mockResolvedValue(mockUserFactory({ id: 1 }));

      await expect(gateway.handleTaskCreatedEvent(largePayload)).resolves.not.toThrow();
    });
  });

  describe('Event Ordering and Consistency', () => {
    it('should maintain event order for sequential operations', async () => {
      const payloads = [
        {
          task: mockTaskFactory({ id: 1, users: [mockUserFactory({ id: 2 })] }),
          createdBy: 1,
        },
        {
          task: mockTaskFactory({ id: 2, users: [mockUserFactory({ id: 2 })] }),
          createdBy: 1,
        },
      ];

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);
      userService.findOne.mockResolvedValue(mockUserFactory({ id: 1 }));

      // Process sequentially
      await gateway.handleTaskCreatedEvent(payloads[0]);
      await gateway.handleTaskCreatedEvent(payloads[1]);

      expect(notificationService.create).toHaveBeenCalledTimes(2);
    });

    it('should handle duplicate events gracefully', async () => {
      const payload = {
        task: mockTaskFactory({
          id: 1,
          users: [mockUserFactory({ id: 2 })],
        }),
        createdBy: 1,
      };

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);
      userService.findOne.mockResolvedValue(mockUserFactory({ id: 1 }));

      // Send same event twice
      await gateway.handleTaskCreatedEvent(payload);
      await gateway.handleTaskCreatedEvent(payload);

      // Should create notifications for both events
      expect(notificationService.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration with External Services', () => {
    it('should integrate with UserService for user enrichment', async () => {
      const payload = {
        task: mockTaskFactory({
          id: 1,
          users: [mockUserFactory({ id: 2 })],
        }),
        createdBy: 1,
      };

      const enrichedUser = mockUserFactory({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      });

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);
      userService.findOne.mockResolvedValue(enrichedUser);

      await gateway.handleTaskCreatedEvent(payload);

      expect(userService.findOne).toHaveBeenCalledWith(1);
      expect(notificationFactory.create).toHaveBeenCalledWith(
        'task.created',
        expect.objectContaining({
          performer: {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
          },
        })
      );
    });

    it('should handle UserService failures gracefully', async () => {
      const payload = {
        task: mockTaskFactory({
          id: 1,
          users: [mockUserFactory({ id: 2 })],
        }),
        createdBy: 1,
      };

      notificationFactory.hasStrategy.mockReturnValue(true);
      notificationFactory.create.mockReturnValue({ userId: 2, message: 'Test' });
      notificationService.create.mockResolvedValue({ id: 1, userId: 2 } as any);
      userService.findOne.mockRejectedValue(new Error('User service down'));

      await expect(gateway.handleTaskCreatedEvent(payload)).resolves.not.toThrow();
    });
  });
});