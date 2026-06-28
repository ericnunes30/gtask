import { Test, TestingModule } from '@nestjs/testing';
import { StartupVerificationService } from './startup-verification.service';
import { NotificationService } from '../../../notification/services/notification.service';
import { NotificationFactory } from '../../../notification/factories/notification.factory';
import { TimerService } from '../../../tasks/services/timer.service';
import { DebugLoggerService } from '../../../notification/services/debug-logger.service';

describe('StartupVerificationService', () => {
  let service: StartupVerificationService;
  let mockNotificationService: NotificationService;
  let mockNotificationFactory: NotificationFactory;
  let mockTimerService: TimerService;
  let mockDebugLogger: DebugLoggerService;

  beforeEach(async () => {
    mockNotificationService = {} as unknown as NotificationService;
    mockNotificationFactory = {} as unknown as NotificationFactory;
    mockTimerService = {} as unknown as TimerService;
    mockDebugLogger = {} as unknown as DebugLoggerService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartupVerificationService,
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: NotificationFactory,
          useValue: mockNotificationFactory,
        },
        {
          provide: TimerService,
          useValue: mockTimerService,
        },
        {
          provide: DebugLoggerService,
          useValue: mockDebugLogger,
        },
      ],
    }).compile();

    service = module.get<StartupVerificationService>(
      StartupVerificationService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verify', () => {
    it('should pass when all services are available', () => {
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      expect(() => service.verify()).not.toThrow();
      expect(logSpy).toHaveBeenCalledWith(
        '✅ All startup verification checks passed',
      );
      logSpy.mockRestore();
    });

    it('should throw when a required service is not available', async () => {
      const moduleWithNull: TestingModule = await Test.createTestingModule({
        providers: [
          StartupVerificationService,
          { provide: NotificationService, useValue: null },
          { provide: NotificationFactory, useValue: mockNotificationFactory },
          { provide: TimerService, useValue: mockTimerService },
          { provide: DebugLoggerService, useValue: mockDebugLogger },
        ],
      }).compile();

      const badService = moduleWithNull.get<StartupVerificationService>(
        StartupVerificationService,
      );

      expect(() => badService.verify()).toThrow(
        'Required service NotificationService is not available',
      );
    });
  });

  describe('executeWithRetry', () => {
    beforeEach(() => {
      jest
        .spyOn(service as unknown as { delay: () => Promise<void> }, 'delay')
        .mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('result');

      const result = await service.executeWithRetry(
        operation,
        'test-operation',
        3,
      );

      expect(result).toBe('result');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should succeed after retry', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce('retry-result');

      const result = await service.executeWithRetry(
        operation,
        'test-operation',
        3,
      );

      expect(result).toBe('retry-result');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new Error('Persistent error'));

      await expect(
        service.executeWithRetry(operation, 'test-operation', 3),
      ).rejects.toThrow('Persistent error');

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use default max retries when not provided', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fail'));

      await expect(
        service.executeWithRetry(operation, 'test-operation'),
      ).rejects.toThrow('Fail');

      expect(operation).toHaveBeenCalledTimes(3);
    });
  });
});
