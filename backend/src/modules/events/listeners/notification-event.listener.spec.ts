import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { NotificationEventListener } from './notification-event.listener';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationFactory } from '../../notification/factories/notification.factory';
import { DebugLoggerService } from '../../notification/services/debug-logger.service';
import { UserService } from '../../user/services/user.service';
import { NOTIFICATION_RECIPIENT_RESOLVER } from '../../notification/interfaces/notification-recipient-resolver.token';
import {
  NotificationType,
  NotificationPriority,
  NotificationCategory,
} from '../../notification/interfaces/notification.types';
import { Task } from '../../tasks/entities/task.entity';
import { Comment } from '../../comment/entities/comment.entity';

describe('NotificationEventListener', () => {
  let listener: NotificationEventListener;
  let notificationService: jest.Mocked<NotificationService>;
  let notificationFactory: jest.Mocked<NotificationFactory>;
  let userService: jest.Mocked<UserService>;
  let recipientResolver: jest.Mocked<{
    getTaskCreatedNotificationRecipients: jest.Mock;
    getTaskUpdatedNotificationRecipients: jest.Mock;
    getTaskStatusUpdatedNotificationRecipients: jest.Mock;
    getCommentCreatedNotificationRecipients: jest.Mock;
  }>;
  let emitMock: jest.Mock;
  let toMock: jest.Mock;
  let mockServer: Server;

  const mockUser = {
    id: 1,
    name: 'John',
    email: 'john@example.com',
  };

  const createMockNotification = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    userId: 1,
    type: NotificationType.TASK_CREATED,
    priority: NotificationPriority.MEDIUM,
    data: { entityType: 'task', entityId: 1, action: 'created' },
    metadata: {
      source: 'test',
      category: NotificationCategory.TASK,
      tags: [],
      version: '1',
    },
    isRead: false,
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    emitMock = jest.fn();
    toMock = jest.fn().mockReturnValue({ emit: emitMock });
    mockServer = { to: toMock } as unknown as Server;

    const mockNotificationService = {
      create: jest
        .fn()
        .mockImplementation((notification) =>
          Promise.resolve({ ...notification, id: 1 }),
        ),
    };

    const mockNotificationFactory = {
      hasStrategy: jest.fn().mockReturnValue(true),
      create: jest.fn().mockImplementation(() => createMockNotification()),
    };

    const mockDebugLogger = {
      logNotificationEvent: jest.fn().mockImplementation(() => {}),
      logError: jest.fn().mockImplementation(() => {}),
    };

    const mockUserService = {
      findOne: jest.fn().mockResolvedValue(mockUser),
    };

    recipientResolver = {
      getTaskCreatedNotificationRecipients: jest.fn().mockReturnValue([2]),
      getTaskUpdatedNotificationRecipients: jest.fn().mockReturnValue([2]),
      getTaskStatusUpdatedNotificationRecipients: jest
        .fn()
        .mockReturnValue([2]),
      getCommentCreatedNotificationRecipients: jest.fn().mockReturnValue([2]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationEventListener,
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: NotificationFactory, useValue: mockNotificationFactory },
        { provide: DebugLoggerService, useValue: mockDebugLogger },
        { provide: UserService, useValue: mockUserService },
        {
          provide: NOTIFICATION_RECIPIENT_RESOLVER,
          useValue: recipientResolver,
        },
      ],
    }).compile();

    listener = module.get(NotificationEventListener);
    notificationService = module.get(NotificationService);
    notificationFactory = module.get(NotificationFactory);
    userService = module.get(UserService);

    listener.setServer(mockServer);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('setServer', () => {
    it('should set the server reference', () => {
      const newEmitMock = jest.fn();
      const newToMock = jest.fn().mockReturnValue({ emit: newEmitMock });
      const newServer = { to: newToMock } as unknown as Server;

      listener.setServer(newServer);

      const emitToUser = Reflect.get(listener, 'emitToUser') as (
        userId: number,
        notification: unknown,
      ) => void;
      emitToUser.call(listener, 1, { test: true });

      expect(newToMock).toHaveBeenCalledWith('user_1');
      expect(newEmitMock).toHaveBeenCalledWith('new_structured_notification', {
        test: true,
      });
    });
  });

  describe('emitToUser', () => {
    it('should emit notification to user socket', () => {
      const emitToUser = Reflect.get(listener, 'emitToUser') as (
        userId: number,
        notification: unknown,
      ) => void;
      const notification = { id: 1 };

      emitToUser.call(listener, 1, notification);

      expect(toMock).toHaveBeenCalledWith('user_1');
      expect(emitMock).toHaveBeenCalledWith(
        'new_structured_notification',
        notification,
      );
    });

    it('should not emit when server is not set', () => {
      listener.setServer(null as unknown as Server);

      const emitToUser = Reflect.get(listener, 'emitToUser') as (
        userId: number,
        notification: unknown,
      ) => void;
      emitToUser.call(listener, 1, { id: 1 });

      expect(toMock).not.toHaveBeenCalled();
    });
  });

  describe('handleTaskCreatedEvent', () => {
    const task = { id: 1, title: 'New Task' } as Task;
    const payload = { task, createdBy: 1 };

    it('should process notification for recipients', async () => {
      await listener.handleTaskCreatedEvent(payload);

      expect(notificationFactory.hasStrategy).toHaveBeenCalledWith(
        'task.created',
      );
      expect(
        recipientResolver.getTaskCreatedNotificationRecipients,
      ).toHaveBeenCalledWith(task, 1);
      expect(userService.findOne).toHaveBeenCalledWith(1);
      expect(notificationFactory.create).toHaveBeenCalled();
      expect(notificationService.create).toHaveBeenCalled();
      expect(toMock).toHaveBeenCalledWith('user_2');
      expect(emitMock).toHaveBeenCalledWith(
        'new_structured_notification',
        expect.any(Object),
      );
    });

    it('should return early when no strategy is found', async () => {
      notificationFactory.hasStrategy.mockReturnValueOnce(false);

      await listener.handleTaskCreatedEvent(payload);

      expect(notificationFactory.create).not.toHaveBeenCalled();
      expect(notificationService.create).not.toHaveBeenCalled();
    });

    it('should return early when no recipients are found', async () => {
      recipientResolver.getTaskCreatedNotificationRecipients.mockReturnValueOnce(
        [],
      );

      await listener.handleTaskCreatedEvent(payload);

      expect(notificationFactory.create).not.toHaveBeenCalled();
      expect(notificationService.create).not.toHaveBeenCalled();
    });

    it('should continue processing when user lookup fails', async () => {
      userService.findOne.mockRejectedValueOnce(new Error('User not found'));

      await listener.handleTaskCreatedEvent(payload);

      expect(notificationService.create).toHaveBeenCalled();
      expect(toMock).toHaveBeenCalledWith('user_2');
    });

    it('should log error and not throw when notification processing fails', async () => {
      notificationService.create.mockRejectedValueOnce(new Error('DB error'));

      const loggerErrorSpy = jest
        .spyOn(
          (listener as unknown as Record<string, unknown>)['logger'],
          'error',
        )
        .mockImplementation(() => {});

      await expect(
        listener.handleTaskCreatedEvent(payload),
      ).resolves.not.toThrow();

      expect(notificationService.create).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });
  });

  describe('handleTaskStatusUpdatedEvent', () => {
    const task = { id: 1, title: 'Task' } as Task;
    const payload = {
      task,
      updatedBy: 1,
      oldStatus: 'open',
      newStatus: 'in_progress',
    };

    it('should process notification for recipients', async () => {
      await listener.handleTaskStatusUpdatedEvent(payload);

      expect(notificationFactory.hasStrategy).toHaveBeenCalledWith(
        'task.status.changed',
      );
      expect(
        recipientResolver.getTaskStatusUpdatedNotificationRecipients,
      ).toHaveBeenCalledWith(task, 1, 'in_progress');
      expect(notificationService.create).toHaveBeenCalled();
      expect(toMock).toHaveBeenCalledWith('user_2');
      expect(emitMock).toHaveBeenCalledWith(
        'new_structured_notification',
        expect.any(Object),
      );
    });

    it('should return early when no strategy is found', async () => {
      notificationFactory.hasStrategy.mockReturnValueOnce(false);

      await listener.handleTaskStatusUpdatedEvent(payload);

      expect(notificationFactory.create).not.toHaveBeenCalled();
      expect(notificationService.create).not.toHaveBeenCalled();
    });

    it('should return early when no recipients are found', async () => {
      recipientResolver.getTaskStatusUpdatedNotificationRecipients.mockReturnValueOnce(
        [],
      );

      await listener.handleTaskStatusUpdatedEvent(payload);

      expect(notificationFactory.create).not.toHaveBeenCalled();
      expect(notificationService.create).not.toHaveBeenCalled();
    });
  });

  describe('handleCommentCreatedEvent', () => {
    const comment = { id: 1, task_id: 1, content: 'Nice work!' } as Comment;
    const payload = { comment, createdBy: 1 };

    it('should process notification for recipients', async () => {
      await listener.handleCommentCreatedEvent(payload);

      expect(notificationFactory.hasStrategy).toHaveBeenCalledWith(
        'comment.created',
      );
      expect(
        recipientResolver.getCommentCreatedNotificationRecipients,
      ).toHaveBeenCalledWith(comment, 1);
      expect(notificationService.create).toHaveBeenCalled();
      expect(toMock).toHaveBeenCalledWith('user_2');
      expect(emitMock).toHaveBeenCalledWith(
        'new_structured_notification',
        expect.any(Object),
      );
    });

    it('should return early when no strategy is found', async () => {
      notificationFactory.hasStrategy.mockReturnValueOnce(false);

      await listener.handleCommentCreatedEvent(payload);

      expect(notificationFactory.create).not.toHaveBeenCalled();
      expect(notificationService.create).not.toHaveBeenCalled();
    });

    it('should return early when no recipients are found', async () => {
      recipientResolver.getCommentCreatedNotificationRecipients.mockReturnValueOnce(
        [],
      );

      await listener.handleCommentCreatedEvent(payload);

      expect(notificationFactory.create).not.toHaveBeenCalled();
      expect(notificationService.create).not.toHaveBeenCalled();
    });
  });

  describe('handleTaskUpdatedEvent', () => {
    const task = { id: 1, title: 'Task' } as Task;
    const payload = {
      task,
      updatedBy: 1,
      changedFields: {
        status: { oldValue: 'open', newValue: 'in_progress' },
      },
    };

    it('should process notification for recipients', async () => {
      await listener.handleTaskUpdatedEvent(payload);

      expect(notificationFactory.hasStrategy).toHaveBeenCalledWith(
        'task.updated',
      );
      expect(
        recipientResolver.getTaskUpdatedNotificationRecipients,
      ).toHaveBeenCalledWith(task, 1);
      expect(notificationService.create).toHaveBeenCalled();
      expect(toMock).toHaveBeenCalledWith('user_2');
      expect(emitMock).toHaveBeenCalledWith(
        'new_structured_notification',
        expect.any(Object),
      );
    });

    it('should return early when no strategy is found', async () => {
      notificationFactory.hasStrategy.mockReturnValueOnce(false);

      await listener.handleTaskUpdatedEvent(payload);

      expect(notificationFactory.create).not.toHaveBeenCalled();
      expect(notificationService.create).not.toHaveBeenCalled();
    });

    it('should return early when no recipients are found', async () => {
      recipientResolver.getTaskUpdatedNotificationRecipients.mockReturnValueOnce(
        [],
      );

      await listener.handleTaskUpdatedEvent(payload);

      expect(notificationFactory.create).not.toHaveBeenCalled();
      expect(notificationService.create).not.toHaveBeenCalled();
    });
  });

  describe('handleEvent - enrich payload error path branches', () => {
    type EventPayload = Record<string, unknown>;

    const callHandleEvent = async (
      payload: EventPayload,
      getUsersToNotify: (p: EventPayload) => number[],
    ): Promise<void> => {
      const handleEvent = Reflect.get(listener, 'handleEvent') as (
        eventName: string,
        payload: EventPayload,
        getUsersToNotify: (payload: EventPayload) => number[],
      ) => Promise<void>;
      await handleEvent.call(
        listener,
        'task.created',
        payload,
        getUsersToNotify,
      );
    };

    it('should skip performer enrichment when no actor id is present in payload', async () => {
      await callHandleEvent({}, () => [2]);

      expect(userService.findOne).not.toHaveBeenCalled();
      expect(notificationFactory.create).toHaveBeenCalledWith(
        'task.created',
        expect.not.objectContaining({ performer: expect.anything() }),
      );
      expect(notificationService.create).toHaveBeenCalled();
      expect(toMock).toHaveBeenCalledWith('user_2');
    });

    it('should enrich payload using userId when createdBy and updatedBy are absent', async () => {
      const actor = { id: 5, name: 'Alice', email: 'alice@example.com' };
      userService.findOne.mockResolvedValueOnce(actor);

      await callHandleEvent({ userId: 5 }, () => [2]);

      expect(userService.findOne).toHaveBeenCalledWith(5);
      expect(notificationFactory.create).toHaveBeenCalledWith(
        'task.created',
        expect.objectContaining({
          userId: 5,
          performer: { id: 5, name: 'Alice', email: 'alice@example.com' },
        }),
      );
      expect(notificationService.create).toHaveBeenCalled();
    });

    it('should handle non-Error rejection during performer enrichment', async () => {
      userService.findOne.mockRejectedValueOnce('network failure' as never);

      const loggerWarnSpy = jest
        .spyOn(
          (listener as unknown as Record<string, unknown>)['logger'],
          'warn',
        )
        .mockImplementation(() => {});

      await expect(
        callHandleEvent({ userId: 5 }, () => [2]),
      ).resolves.not.toThrow();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not enrich payload with performer'),
      );
      expect(notificationService.create).toHaveBeenCalled();

      loggerWarnSpy.mockRestore();
    });

    it('should process notifications for multiple deduplicated recipients', async () => {
      recipientResolver.getTaskCreatedNotificationRecipients.mockReturnValueOnce(
        [2, 3, 2, 3],
      );

      const task = { id: 1, title: 'Multi Task' } as Task;
      await listener.handleTaskCreatedEvent({ task, createdBy: 1 });

      expect(notificationService.create).toHaveBeenCalledTimes(2);
      expect(toMock).toHaveBeenCalledWith('user_2');
      expect(toMock).toHaveBeenCalledWith('user_3');
    });
  });
});
