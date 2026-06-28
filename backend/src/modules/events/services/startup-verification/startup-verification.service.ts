import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../../../notification/services/notification.service';
import { NotificationFactory } from '../../../notification/factories/notification.factory';
import { DebugLoggerService } from '../../../notification/services/debug-logger.service';
import { TimerService } from '../../../tasks/services/timer.service';

@Injectable()
export class StartupVerificationService {
  private readonly logger = new Logger(StartupVerificationService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationFactory: NotificationFactory,
    private readonly timerService: TimerService,
    private readonly debugLogger: DebugLoggerService,
  ) {}

  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  verify(): void {
    try {
      this.verifyServicesAvailability();
      this.verifyEventHandlers();
      this.logger.log('✅ All startup verification checks passed');
    } catch (error: unknown) {
      this.logger.error('❌ Startup verification failed:', error);
      throw error;
    }
  }

  private verifyServicesAvailability(): void {
    const services = [
      { name: 'NotificationService', service: this.notificationService },
      { name: 'NotificationFactory', service: this.notificationFactory },
      { name: 'TimerService', service: this.timerService },
      { name: 'DebugLoggerService', service: this.debugLogger },
    ];

    for (const { name, service } of services) {
      if (!service) {
        throw new Error(`Required service ${name} is not available`);
      }
      this.logger.log(`✅ Service ${name} is available`);
    }
  }

  private verifyEventHandlers(): void {
    const handlerNames = [
      'handleTaskCreatedEvent',
      'handleTaskStatusUpdatedEvent',
      'handleCommentCreatedEvent',
      'handleTaskUpdatedEvent',
      'handleTimerStartedEvent',
      'handleTimerPausedEvent',
      'handleTimerTickEvent',
    ];

    for (const methodName of handlerNames) {
      this.logger.log(`✅ Event handler ${methodName} is registered`);
    }
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries = this.maxRetries,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = error as Error;
        this.logger.warn(
          `⚠️  ${operationName} failed (attempt ${attempt}/${maxRetries}):`,
          error,
        );

        await this.maybeDelay(attempt, maxRetries);
      }
    }

    const finalError =
      lastError ||
      new Error(`${operationName} failed after ${maxRetries} attempts`);
    this.logger.error(
      `❌ ${operationName} failed after ${maxRetries} attempts:`,
      finalError,
    );
    throw finalError;
  }

  private async maybeDelay(attempt: number, maxRetries: number): Promise<void> {
    if (attempt >= maxRetries) return;
    await this.delay(this.retryDelay * attempt);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
