import { Test, TestingModule } from '@nestjs/testing';
import { EventsModule } from '../../src/modules/events/events.module';
import { EventsGateway } from '../../src/modules/events/gateways/events.gateway';
import { NotificationModule } from '../../src/modules/notification/notification.module';
import { TaskModule } from '../../src/modules/tasks/task.module';
import { UserModule } from '../../src/modules/user/user.module';
import { NotificationService } from '../../src/modules/notification/services/notification.service';
import { NotificationFactory } from '../../src/modules/notification/factories/notification.factory';
import { DebugLoggerService } from '../../src/modules/notification/services/debug-logger.service';
import { TimerService } from '../../src/modules/tasks/services/timer.service';
import { UserService } from '../../src/modules/user/services/user.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('EventsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        EventsModule,
      ],
    })
    .overrideProvider(NotificationService)
    .useValue({
      create: jest.fn(),
    })
    .overrideProvider(NotificationFactory)
    .useValue({
      hasStrategy: jest.fn(),
      getRegisteredEvents: jest.fn(),
      create: jest.fn(),
    })
    .overrideProvider(DebugLoggerService)
    .useValue({
      logWebSocketEvent: jest.fn(),
      logNotificationEvent: jest.fn(),
    })
    .overrideProvider(TimerService)
    .useValue({
      start: jest.fn(),
      pause: jest.fn(),
    })
    .overrideProvider(UserService)
    .useValue({
      findOne: jest.fn(),
    })
    .overrideProvider(EventEmitter2)
    .useValue({
      on: jest.fn(),
      emit: jest.fn(),
    })
    .compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should import required modules', () => {
    const notificationModule = module.get<NotificationModule>(NotificationModule);
    const taskModule = module.get<TaskModule>(TaskModule);
    const userModule = module.get<UserModule>(UserModule);
    
    expect(notificationModule).toBeDefined();
    expect(taskModule).toBeDefined();
    expect(userModule).toBeDefined();
  });

  it('should provide EventsGateway', () => {
    const eventsGateway = module.get<EventsGateway>(EventsGateway);
    expect(eventsGateway).toBeDefined();
  });

  it('should have EventsGateway as the only provider', () => {
    const providers = Reflect.getMetadata('providers', EventsModule);
    expect(providers).toHaveLength(1);
    expect(providers[0]).toBe(EventsGateway);
  });

  it('should compile module successfully', async () => {
    await expect(module.compile()).resolves.not.toThrow();
  });

  describe('Module Dependencies', () => {
    it('should inject NotificationService', () => {
      const notificationService = module.get(NotificationService);
      expect(notificationService).toBeDefined();
    });

    it('should inject NotificationFactory', () => {
      const notificationFactory = module.get(NotificationFactory);
      expect(notificationFactory).toBeDefined();
    });

    it('should inject DebugLoggerService', () => {
      const debugLoggerService = module.get(DebugLoggerService);
      expect(debugLoggerService).toBeDefined();
    });

    it('should inject TimerService', () => {
      const timerService = module.get(TimerService);
      expect(timerService).toBeDefined();
    });

    it('should inject UserService', () => {
      const userService = module.get(UserService);
      expect(userService).toBeDefined();
    });

    it('should inject EventEmitter2', () => {
      const eventEmitter = module.get(EventEmitter2);
      expect(eventEmitter).toBeDefined();
    });
  });

  describe('Circular Dependencies', () => {
    it('should handle forwardRef for TaskModule', () => {
      // This test ensures that the forwardRef for TaskModule is properly handled
      expect(() => module.get(TaskModule)).not.toThrow();
    });
  });

  describe('Module Initialization', () => {
    it('should initialize without errors', async () => {
      await expect(module.init()).resolves.not.toThrow();
    });

    it('should create module instance with proper dependencies', () => {
      const eventsModule = module.get<EventsModule>(EventsModule);
      expect(eventsModule).toBeInstanceOf(EventsModule);
    });
  });
});