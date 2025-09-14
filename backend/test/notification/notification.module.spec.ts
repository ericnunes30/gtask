import { Test, TestingModule } from '@nestjs/testing';
import { NotificationModule } from '../../src/modules/notification/notification.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { StructuredNotificationEntity } from '../../src/modules/notification/entities/notification.entity';
import { NotificationService } from '../../src/modules/notification/services/notification.service';
import { DebugLoggerService } from '../../src/modules/notification/services/debug-logger.service';
import { NotificationController } from '../../src/modules/notification/controllers/notification.controller';
import { NotificationFactory } from '../../src/modules/notification/factories/notification.factory';
import { 
  TaskCreatedStrategy, 
  TaskStatusUpdatedStrategy, 
  CommentCreatedStrategy, 
  TimerStartedStrategy,
  TimerPausedStrategy,
  TaskUpdatedStrategy
} from '../../src/modules/notification/factories/strategies';

describe('NotificationModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        NotificationModule,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'JWT_SECRET') return 'test-secret';
          return undefined;
        }),
      })
      .compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
    expect(module.get(NotificationModule)).toBeDefined();
  });

  it('should provide NotificationService', () => {
    const service = module.get<NotificationService>(NotificationService);
    expect(service).toBeDefined();
  });

  it('should provide DebugLoggerService', () => {
    const service = module.get<DebugLoggerService>(DebugLoggerService);
    expect(service).toBeDefined();
  });

  it('should provide NotificationController', () => {
    const controller = module.get<NotificationController>(NotificationController);
    expect(controller).toBeDefined();
  });

  it('should provide NotificationFactory', () => {
    const factory = module.get<NotificationFactory>(NotificationFactory);
    expect(factory).toBeDefined();
  });

  it('should provide all strategy instances', () => {
    const taskCreatedStrategy = module.get<TaskCreatedStrategy>(TaskCreatedStrategy);
    const taskStatusUpdatedStrategy = module.get<TaskStatusUpdatedStrategy>(TaskStatusUpdatedStrategy);
    const commentCreatedStrategy = module.get<CommentCreatedStrategy>(CommentCreatedStrategy);
    const timerStartedStrategy = module.get<TimerStartedStrategy>(TimerStartedStrategy);
    const timerPausedStrategy = module.get<TimerPausedStrategy>(TimerPausedStrategy);
    const taskUpdatedStrategy = module.get<TaskUpdatedStrategy>(TaskUpdatedStrategy);

    expect(taskCreatedStrategy).toBeDefined();
    expect(taskStatusUpdatedStrategy).toBeDefined();
    expect(commentCreatedStrategy).toBeDefined();
    expect(timerStartedStrategy).toBeDefined();
    expect(timerPausedStrategy).toBeDefined();
    expect(taskUpdatedStrategy).toBeDefined();
  });

  it('should provide NOTIFICATION_STRATEGY token with all strategies', () => {
    const strategies = module.get('NOTIFICATION_STRATEGY') as any[];
    expect(strategies).toBeDefined();
    expect(Array.isArray(strategies)).toBe(true);
    expect(strategies.length).toBe(6);
    
    expect(strategies[0]).toBeInstanceOf(TaskCreatedStrategy);
    expect(strategies[1]).toBeInstanceOf(TaskStatusUpdatedStrategy);
    expect(strategies[2]).toBeInstanceOf(CommentCreatedStrategy);
    expect(strategies[3]).toBeInstanceOf(TimerStartedStrategy);
    expect(strategies[4]).toBeInstanceOf(TimerPausedStrategy);
    expect(strategies[5]).toBeInstanceOf(TaskUpdatedStrategy);
  });

  it('should export NotificationService', () => {
    const notificationService = module.get<NotificationService>(NotificationService);
    expect(notificationService).toBeDefined();
  });

  it('should export DebugLoggerService', () => {
    const debugLoggerService = module.get<DebugLoggerService>(DebugLoggerService);
    expect(debugLoggerService).toBeDefined();
  });

  it('should export NotificationFactory', () => {
    const notificationFactory = module.get<NotificationFactory>(NotificationFactory);
    expect(notificationFactory).toBeDefined();
  });

  it('should import TypeOrmModule with entity', () => {
    const typeOrmModule = module.get(TypeOrmModule.forFeature([StructuredNotificationEntity]));
    expect(typeOrmModule).toBeDefined();
  });

  it('should import ConfigModule', () => {
    const configModule = module.get(ConfigModule);
    expect(configModule).toBeDefined();
  });

  it('should import JwtModule with async configuration', () => {
    const jwtModule = module.get(JwtModule);
    expect(jwtModule).toBeDefined();
  });
});