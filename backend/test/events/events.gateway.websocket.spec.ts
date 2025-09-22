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

describe('EventsGateway WebSocket Functionality', () => {
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

  describe('WebSocket Lifecycle', () => {
    describe('afterInit', () => {
      it('should log server initialization', () => {
        const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

        gateway.afterInit(mockServer);

        expect(loggerSpy).toHaveBeenCalledWith('WebSocket server initialized');
      });
    });

    describe('onModuleInit', () => {
      it('should perform startup verification', async () => {
        const performStartupVerificationSpy = jest.spyOn(gateway as any, 'performStartupVerification');
        const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

        await gateway.onModuleInit();

        expect(performStartupVerificationSpy).toHaveBeenCalled();
        expect(loggerSpy).toHaveBeenCalledWith('🚀 EventsGateway initializing - performing startup verification...');
        expect(loggerSpy).toHaveBeenCalledWith('✅ EventsGateway initialization completed successfully');
        expect((gateway as any).isInitialized).toBe(true);
      });

      it('should handle startup verification errors', async () => {
        const performStartupVerificationSpy = jest.spyOn(gateway as any, 'performStartupVerification');
        const loggerSpy = jest.spyOn((gateway as any).logger, 'error');
        const error = new Error('Startup failed');

        performStartupVerificationSpy.mockRejectedValue(error);

        await expect(gateway.onModuleInit()).rejects.toThrow(error);
        expect(loggerSpy).toHaveBeenCalledWith('❌ Startup verification failed:', error);
        expect((gateway as any).isInitialized).toBe(false);
      });
    });

    describe('performStartupVerification', () => {
      it('should verify services availability and event handlers', async () => {
        const verifyServicesSpy = jest.spyOn(gateway as any, 'verifyServicesAvailability');
        const verifyEventHandlersSpy = jest.spyOn(gateway as any, 'verifyEventHandlers');
        const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

        await (gateway as any).performStartupVerification();

        expect(verifyServicesSpy).toHaveBeenCalled();
        expect(verifyEventHandlersSpy).toHaveBeenCalled();
        expect(loggerSpy).toHaveBeenCalledWith('✅ All startup verification checks passed');
      });

      it('should handle verification errors', async () => {
        const verifyServicesSpy = jest.spyOn(gateway as any, 'verifyServicesAvailability');
        const loggerSpy = jest.spyOn((gateway as any).logger, 'error');
        const error = new Error('Service verification failed');

        verifyServicesSpy.mockRejectedValue(error);

        await expect((gateway as any).performStartupVerification()).rejects.toThrow(error);
        expect(loggerSpy).toHaveBeenCalledWith('❌ Startup verification failed:', error);
      });
    });

    describe('verifyServicesAvailability', () => {
      it('should verify all required services are available', async () => {
        const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

        await (gateway as any).verifyServicesAvailability();

        expect(loggerSpy).toHaveBeenCalledWith('✅ Service NotificationService is available');
        expect(loggerSpy).toHaveBeenCalledWith('✅ Service NotificationFactory is available');
        expect(loggerSpy).toHaveBeenCalledWith('✅ Service TimerService is available');
        expect(loggerSpy).toHaveBeenCalledWith('✅ Service DebugLoggerService is available');
      });

      it('should throw error when a service is not available', async () => {
        const originalNotificationService = gateway['notificationService'];
        gateway['notificationService'] = null;

        await expect((gateway as any).verifyServicesAvailability()).rejects.toThrow(
          'Required service NotificationService is not available'
        );

        // Restore the service
        gateway['notificationService'] = originalNotificationService;
      });
    });

    describe('verifyEventHandlers', () => {
      it('should verify all event handler methods are present', async () => {
        const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

        await (gateway as any).verifyEventHandlers();

        const expectedMethods = [
          'handleTaskCreatedEvent',
          'handleTaskStatusUpdatedEvent',
          'handleCommentCreatedEvent',
          'handleTaskUpdatedEvent',
          'handleTimerStartedEvent',
          'handleTimerPausedEvent',
          'handleTimerTickEvent'
        ];

        expectedMethods.forEach(method => {
          expect(loggerSpy).toHaveBeenCalledWith(`✅ Event handler ${method} is registered`);
        });
      });

      it('should warn when event handler method is missing', async () => {
        const loggerSpy = jest.spyOn((gateway as any).logger, 'warn');
        
        // Temporarily remove a method
        const originalMethod = (gateway as any).handleTaskCreatedEvent;
        delete (gateway as any).handleTaskCreatedEvent;

        await (gateway as any).verifyEventHandlers();

        expect(loggerSpy).toHaveBeenCalledWith('⚠️  Event handler method handleTaskCreatedEvent not found');

        // Restore the method
        (gateway as any).handleTaskCreatedEvent = originalMethod;
      });
    });

    describe('executeWithRetry', () => {
      it('should execute operation successfully on first attempt', async () => {
        const operation = jest.fn().mockResolvedValue('success');
        const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

        const result = await (gateway as any).executeWithRetry(operation, 'test operation');

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
        expect(loggerSpy).not.toHaveBeenCalled();
      });

      it('should retry operation on failure and eventually succeed', async () => {
        const operation = jest.fn()
          .mockRejectedValueOnce(new Error('First failure'))
          .mockRejectedValueOnce(new Error('Second failure'))
          .mockResolvedValue('success');
        const loggerWarnSpy = jest.spyOn((gateway as any).logger, 'warn');
        const delaySpy = jest.spyOn(gateway as any, 'delay').mockResolvedValue();

        const result = await (gateway as any).executeWithRetry(operation, 'test operation');

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(3);
        expect(loggerWarnSpy).toHaveBeenCalledTimes(2);
        expect(delaySpy).toHaveBeenCalledTimes(2);
      });

      it('should throw error after max retries', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));
        const loggerWarnSpy = jest.spyOn((gateway as any).logger, 'warn');
        const loggerErrorSpy = jest.spyOn((gateway as any).logger, 'error');
        const delaySpy = jest.spyOn(gateway as any, 'delay').mockResolvedValue();

        await expect(
          (gateway as any).executeWithRetry(operation, 'test operation', 2)
        ).rejects.toThrow('test operation failed after 2 attempts');

        expect(operation).toHaveBeenCalledTimes(2);
        expect(loggerWarnSpy).toHaveBeenCalledTimes(2);
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          '❌ test operation failed after 2 attempts:',
          expect.any(Error)
        );
      });
    });

    describe('delay', () => {
      it('should create a delay for the specified time', async () => {
        const start = Date.now();
        await (gateway as any).delay(100);
        const end = Date.now();
        
        expect(end - start).toBeGreaterThanOrEqual(90); // Allow some margin
      });
    });
  });

  describe('Connection Handling', () => {
    describe('handleConnection', () => {
      it('should handle authenticated connection', () => {
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

      it('should handle unauthorized connection', () => {
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

      it('should handle connection with user having undefined sub property', () => {
        const mockClient = {
          id: 'client-1',
          user: {},
          disconnect: jest.fn(),
        } as any;

        gateway.handleConnection(mockClient);

        expect(debugLoggerService.logWebSocketEvent).toHaveBeenCalledWith('unauthorized_connection', 'client-1');
        expect(mockClient.disconnect).toHaveBeenCalled();
      });
    });

    describe('handleDisconnect', () => {
      it('should log client disconnection', () => {
        const mockClient = {
          id: 'client-1',
        } as any;

        const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

        gateway.handleDisconnect(mockClient);

        expect(loggerSpy).toHaveBeenCalledWith('Client disconnected: client-1');
      });
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

  describe('Timer Message Handlers', () => {
    describe('handleTimerStart', () => {
      it('should handle authorized timer start request', () => {
        const mockClient = {
          id: 'client-1',
          user: { sub: 1 },
          emit: jest.fn(),
        } as any;

        const payload = { taskId: 123 };
        const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

        gateway.handleTimerStart(mockClient, payload);

        expect(loggerSpy).toHaveBeenCalledWith('Timer start requested for task 123 by user 1');
        expect(timerService.start).toHaveBeenCalledWith(123, 1);
      });

      it('should handle unauthorized timer start request', () => {
        const mockClient = {
          id: 'client-1',
          disconnect: jest.fn(),
          emit: jest.fn(),
        } as any;

        const payload = { taskId: 123 };
        const loggerWarnSpy = jest.spyOn((gateway as any).logger, 'warn');

        gateway.handleTimerStart(mockClient, payload);

        expect(loggerWarnSpy).toHaveBeenCalledWith('Unauthorized timer.start from client-1');
        expect(mockClient.emit).toHaveBeenCalledWith('error', {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated'
        });
        expect(mockClient.disconnect).toHaveBeenCalled();
        expect(timerService.start).not.toHaveBeenCalled();
      });

      it('should handle timer service errors', () => {
        const mockClient = {
          id: 'client-1',
          user: { sub: 1 },
          emit: jest.fn(),
        } as any;

        const payload = { taskId: 123 };
        const error = new Error('Timer start failed');
        timerService.start.mockImplementation(() => {
          throw error;
        });

        const loggerErrorSpy = jest.spyOn((gateway as any).logger, 'error');

        gateway.handleTimerStart(mockClient, payload);

        expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to start timer for task 123: Timer start failed');
        expect(mockClient.emit).toHaveBeenCalledWith('error', {
          code: 'TIMER_START_FAILED',
          message: 'Unable to start timer'
        });
      });
    });

    describe('handleTimerPause', () => {
      it('should handle authorized timer pause request', () => {
        const mockClient = {
          id: 'client-1',
          user: { sub: 1 },
          emit: jest.fn(),
        } as any;

        const payload = { taskId: 123 };
        const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

        gateway.handleTimerPause(mockClient, payload);

        expect(loggerSpy).toHaveBeenCalledWith('Timer pause requested for task 123 by user 1');
        expect(timerService.pause).toHaveBeenCalledWith(123, 1);
      });

      it('should handle unauthorized timer pause request', () => {
        const mockClient = {
          id: 'client-1',
          disconnect: jest.fn(),
          emit: jest.fn(),
        } as any;

        const payload = { taskId: 123 };
        const loggerWarnSpy = jest.spyOn((gateway as any).logger, 'warn');

        gateway.handleTimerPause(mockClient, payload);

        expect(loggerWarnSpy).toHaveBeenCalledWith('Unauthorized timer.pause from client-1');
        expect(mockClient.emit).toHaveBeenCalledWith('error', {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated'
        });
        expect(mockClient.disconnect).toHaveBeenCalled();
        expect(timerService.pause).not.toHaveBeenCalled();
      });

      it('should handle timer service errors', () => {
        const mockClient = {
          id: 'client-1',
          user: { sub: 1 },
          emit: jest.fn(),
        } as any;

        const payload = { taskId: 123 };
        const error = new Error('Timer pause failed');
        timerService.pause.mockImplementation(() => {
          throw error;
        });

        const loggerErrorSpy = jest.spyOn((gateway as any).logger, 'error');

        gateway.handleTimerPause(mockClient, payload);

        expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to pause timer for task 123: Timer pause failed');
        expect(mockClient.emit).toHaveBeenCalledWith('error', {
          code: 'TIMER_PAUSE_FAILED',
          message: 'Unable to pause timer'
        });
      });
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

  describe('Event Bridge Setup', () => {
    it('should set up event bridges in constructor', () => {
      // Test that the constructor sets up event bridges correctly
      expect(eventEmitter.on).toHaveBeenCalledWith('timer.started', expect.any(Function));
      expect(eventEmitter.on).toHaveBeenCalledWith('timer.paused', expect.any(Function));
      expect(eventEmitter.on).toHaveBeenCalledWith('timer.tick', expect.any(Function));
    });

    it('should bridge timer.started events to WebSocket rooms', () => {
      // Simulate event bridge call
      const onCalls = eventEmitter.on.mock.calls;
      const timerStartedHandler = onCalls.find(call => call[0] === 'timer.started')?.[1];

      expect(timerStartedHandler).toBeDefined();

      if (timerStartedHandler) {
        const payload = { taskId: 123, userId: 1 };
        const loggerSpy = jest.spyOn((gateway as any).logger, 'log');

        timerStartedHandler(payload);

        expect(loggerSpy).toHaveBeenCalledWith('Bridging timer.started for task 123');
        expect(mockServer.to).toHaveBeenCalledWith(`task_123`);
        expect(mockServer.emit).toHaveBeenCalledWith('timer.started', payload);
      }
    });

    it('should bridge timer.paused events to WebSocket rooms', () => {
      const onCalls = eventEmitter.on.mock.calls;
      const timerPausedHandler = onCalls.find(call => call[0] === 'timer.paused')?.[1];

      expect(timerPausedHandler).toBeDefined();

      if (timerPausedHandler) {
        const payload = { taskId: 123, seconds: 150, userId: 1 };
        
        timerPausedHandler(payload);

        expect(mockServer.to).toHaveBeenCalledWith(`task_123`);
        expect(mockServer.emit).toHaveBeenCalledWith('timer.paused', payload);
      }
    });

    it('should bridge timer.tick events to WebSocket rooms', () => {
      const onCalls = eventEmitter.on.mock.calls;
      const timerTickHandler = onCalls.find(call => call[0] === 'timer.tick')?.[1];

      expect(timerTickHandler).toBeDefined();

      if (timerTickHandler) {
        const payload = { taskId: 123, seconds: 150 };
        
        timerTickHandler(payload);

        expect(mockServer.to).toHaveBeenCalledWith(`task_123`);
        expect(mockServer.emit).toHaveBeenCalledWith('timer.tick', payload);
      }
    });
  });

  describe('Server Property', () => {
    it('should initialize with undefined server', () => {
      const newGateway = new EventsGateway(
        notificationService,
        notificationFactory,
        timerService,
        debugLoggerService,
        eventEmitter,
        userService
      );

      expect(newGateway.server).toBeUndefined();
    });

    it('should allow server to be set', () => {
      gateway.server = mockServer;
      expect(gateway.server).toBe(mockServer);
    });
  });

  describe('WebSocket Decorators', () => {
    it('should have WebSocketGateway decorator with CORS configuration', () => {
      const gatewayMetadata = Reflect.getMetadata('__nest__gateway__', EventsGateway);
      expect(gatewayMetadata).toBeDefined();
      expect(gatewayMetadata.options).toBeDefined();
      expect(gatewayMetadata.options.cors).toBeDefined();
      expect(gatewayMetadata.options.cors.origin).toBe('*');
    });

    it('should have Injectable decorator', () => {
      const injectableMetadata = Reflect.getMetadata('__injectable__', EventsGateway);
      expect(injectableMetadata).toBeDefined();
    });
  });
});