import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { EventsGateway } from './events.gateway';
import { TimerService } from '../../tasks/services/timer.service';
import { DebugLoggerService } from '../../notification/services/debug-logger.service';
import { StartupVerificationService } from '../services/startup-verification/startup-verification.service';
import { NotificationEventListener } from '../listeners/notification-event.listener';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let mockServer: Server;
  let mockEventEmitter: { on: jest.Mock; emit: jest.Mock };
  let mockTimerService: { start: jest.Mock; pause: jest.Mock };
  let mockDebugLogger: { logWebSocketEvent: jest.Mock };
  let mockStartupVerification: { verify: jest.Mock };
  let mockNotificationListener: { setServer: jest.Mock };
  let roomEmitMock: jest.Mock;

  beforeEach(async () => {
    roomEmitMock = jest.fn();
    mockServer = {
      to: jest.fn().mockReturnValue({ emit: roomEmitMock }),
      emit: jest.fn(),
    } as unknown as Server;

    mockEventEmitter = {
      on: jest.fn(),
      emit: jest.fn(),
    };

    mockTimerService = {
      start: jest.fn(),
      pause: jest.fn(),
    };

    mockDebugLogger = {
      logWebSocketEvent: jest.fn(),
    };

    mockStartupVerification = {
      verify: jest.fn(),
    };

    mockNotificationListener = {
      setServer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        { provide: TimerService, useValue: mockTimerService },
        { provide: DebugLoggerService, useValue: mockDebugLogger },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        {
          provide: StartupVerificationService,
          useValue: mockStartupVerification,
        },
        {
          provide: NotificationEventListener,
          useValue: mockNotificationListener,
        },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    Object.defineProperty(gateway, 'server', {
      value: mockServer,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('afterInit', () => {
    it('should set server on notification listener and log', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();
      gateway.afterInit();
      expect(mockNotificationListener.setServer).toHaveBeenCalledWith(
        mockServer,
      );
      expect(logSpy).toHaveBeenCalledWith('WebSocket server initialized');
      logSpy.mockRestore();
    });
  });

  describe('onModuleInit', () => {
    it('should run startup verification and mark initialized', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();
      gateway.onModuleInit();
      expect(mockStartupVerification.verify).toHaveBeenCalled();
      expect(gateway['isInitialized']).toBe(true);
      logSpy.mockRestore();
    });
  });

  describe('handleConnection', () => {
    it('should join user room when client has user', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();
      const mockJoin = jest.fn();
      const client = {
        id: 'client-1',
        user: { sub: 42, email: 'test@test.com', name: 'Test' },
        join: mockJoin,
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(client);

      expect(mockJoin).toHaveBeenCalledWith('user_42');
      expect(mockDebugLogger.logWebSocketEvent).toHaveBeenCalledWith(
        'connection',
        'client-1',
        { userId: 42 },
      );
      logSpy.mockRestore();
    });

    it('should disconnect client without user', () => {
      const warnSpy = jest
        .spyOn(gateway['logger'], 'warn')
        .mockImplementation();
      const mockDisconnect = jest.fn();
      const client = {
        id: 'client-2',
        user: undefined,
        join: jest.fn(),
        disconnect: mockDisconnect,
      } as unknown as Socket;

      gateway.handleConnection(client);

      expect(mockDisconnect).toHaveBeenCalled();
      expect(mockDebugLogger.logWebSocketEvent).toHaveBeenCalledWith(
        'unauthorized_connection',
        'client-2',
      );
      warnSpy.mockRestore();
    });
  });

  describe('handleDisconnect', () => {
    it('should log client disconnect', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();
      const client = { id: 'client-3' } as unknown as Socket;

      gateway.handleDisconnect(client);

      expect(logSpy).toHaveBeenCalledWith('Client disconnected: client-3');
      logSpy.mockRestore();
    });
  });

  describe('bridgeTimerEvents with undefined server', () => {
    it('should not throw when server is undefined and timer event is emitted', () => {
      // Recreate gateway with undefined server
      Object.defineProperty(gateway, 'server', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Get the handlers registered during construction
      const handlers = mockEventEmitter.on.mock.calls;
      const startedHandler = handlers.find(
        (c) => c[0] === 'timer.started',
      )?.[1];
      const pausedHandler = handlers.find((c) => c[0] === 'timer.paused')?.[1];
      const tickHandler = handlers.find((c) => c[0] === 'timer.tick')?.[1];

      // Should not throw
      expect(() => startedHandler({ taskId: 1, userId: 1 })).not.toThrow();
      expect(() =>
        pausedHandler({ taskId: 2, userId: 1, seconds: 10 }),
      ).not.toThrow();
      expect(() => tickHandler({ taskId: 3, seconds: 5 })).not.toThrow();
    });
  });

  describe('emit to room via timer events', () => {
    beforeEach(() => {
      roomEmitMock.mockClear();
    });

    it('should emit timer.started to task room', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();
      gateway.handleTimerStartedEvent({ taskId: 1, userId: 1 });
      expect(mockServer.to).toHaveBeenCalledWith('task_1');
      expect(roomEmitMock).toHaveBeenCalledWith('timer.started', {
        taskId: 1,
        userId: 1,
      });
      logSpy.mockRestore();
    });

    it('should emit timer.paused to task room', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();
      gateway.handleTimerPausedEvent({
        taskId: 2,
        userId: 1,
        seconds: 10,
      });
      expect(mockServer.to).toHaveBeenCalledWith('task_2');
      expect(roomEmitMock).toHaveBeenCalledWith('timer.paused', {
        taskId: 2,
        userId: 1,
        seconds: 10,
      });
      logSpy.mockRestore();
    });

    it('should emit timer.tick to task room', () => {
      gateway.handleTimerTickEvent({ taskId: 3, seconds: 5 });
      expect(mockServer.to).toHaveBeenCalledWith('task_3');
      expect(roomEmitMock).toHaveBeenCalledWith('timer.tick', {
        taskId: 3,
        seconds: 5,
      });
    });
  });

  describe('room management', () => {
    it('should join task room', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();
      const mockJoin = jest.fn();
      const client = {
        id: 'client-4',
        join: mockJoin,
      } as unknown as Socket;

      gateway.handleJoinTaskRoom(client, '10');

      expect(mockJoin).toHaveBeenCalledWith('task_10');
      logSpy.mockRestore();
    });

    it('should leave task room', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();
      const mockLeave = jest.fn();
      const client = {
        id: 'client-5',
        leave: mockLeave,
      } as unknown as Socket;

      gateway.handleLeaveTaskRoom(client, '20');

      expect(mockLeave).toHaveBeenCalledWith('task_20');
      logSpy.mockRestore();
    });
  });

  describe('timer.start', () => {
    it('should start timer for authenticated user', async () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();
      const client = {
        id: 'client-6',
        user: { sub: 7, email: 'a@b.com', name: 'A' },
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      mockTimerService.start.mockResolvedValue(undefined);

      await gateway.handleTimerStart(client, { taskId: 5 });

      expect(mockTimerService.start).toHaveBeenCalledWith(5, 7);
      logSpy.mockRestore();
    });

    it('should disconnect unauthorized timer.start', async () => {
      const warnSpy = jest
        .spyOn(gateway['logger'], 'warn')
        .mockImplementation();
      const mockDisconnect = jest.fn();
      const client = {
        id: 'client-7',
        user: undefined,
        emit: jest.fn(),
        disconnect: mockDisconnect,
      } as unknown as Socket;

      await gateway.handleTimerStart(client, { taskId: 5 });

      expect(mockDisconnect).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should emit error when timer start fails', async () => {
      const errorSpy = jest
        .spyOn(gateway['logger'], 'error')
        .mockImplementation();
      const mockEmit = jest.fn();
      const client = {
        id: 'client-8',
        user: { sub: 8, email: 'c@d.com', name: 'C' },
        emit: mockEmit,
        disconnect: jest.fn(),
      } as unknown as Socket;

      mockTimerService.start.mockRejectedValue(new Error('DB fail'));

      await gateway.handleTimerStart(client, { taskId: 6 });

      expect(mockEmit).toHaveBeenCalledWith('error', {
        code: 'TIMER_START_FAILED',
        message: 'Unable to start timer',
      });
      errorSpy.mockRestore();
    });
  });

  describe('timer.pause', () => {
    it('should pause timer for authenticated user', async () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();
      const client = {
        id: 'client-9',
        user: { sub: 9, email: 'e@f.com', name: 'E' },
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      mockTimerService.pause.mockResolvedValue(undefined);

      await gateway.handleTimerPause(client, { taskId: 8 });

      expect(mockTimerService.pause).toHaveBeenCalledWith(8, 9);
      logSpy.mockRestore();
    });

    it('should disconnect unauthorized timer.pause', async () => {
      const warnSpy = jest
        .spyOn(gateway['logger'], 'warn')
        .mockImplementation();
      const mockDisconnect = jest.fn();
      const mockEmit = jest.fn();
      const client = {
        id: 'client-11',
        user: undefined,
        emit: mockEmit,
        disconnect: mockDisconnect,
      } as unknown as Socket;

      await gateway.handleTimerPause(client, { taskId: 11 });

      expect(mockDisconnect).toHaveBeenCalled();
      expect(mockEmit).toHaveBeenCalledWith('error', {
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
      warnSpy.mockRestore();
    });

    it('should emit error when timer pause fails', async () => {
      const errorSpy = jest
        .spyOn(gateway['logger'], 'error')
        .mockImplementation();
      const mockEmit = jest.fn();
      const client = {
        id: 'client-10',
        user: { sub: 10, email: 'g@h.com', name: 'G' },
        emit: mockEmit,
        disconnect: jest.fn(),
      } as unknown as Socket;

      mockTimerService.pause.mockRejectedValue(new Error('DB fail'));

      await gateway.handleTimerPause(client, { taskId: 9 });

      expect(mockEmit).toHaveBeenCalledWith('error', {
        code: 'TIMER_PAUSE_FAILED',
        message: 'Unable to pause timer',
      });
      errorSpy.mockRestore();
    });
  });
});
