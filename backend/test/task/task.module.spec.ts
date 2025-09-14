import { TaskModule } from '../../src/modules/tasks/task.module';
import { TaskController } from '../../src/modules/tasks/controllers/task.controller';
import { TaskService } from '../../src/modules/tasks/services/task.service';

describe('TaskModule', () => {
  it('should be defined', () => {
    expect(TaskModule).toBeDefined();
  });

  it('should have correct controller', () => {
    const controllers = Reflect.getMetadata('controllers', TaskModule) || [];
    expect(controllers).toContain(TaskController);
  });

  it('should export TaskService', () => {
    const exports = Reflect.getMetadata('exports', TaskModule) || [];
    expect(exports).toContain(TaskService);
  });

  it('should have TaskController as controller', () => {
    const controllers = TaskModule['controllers'] || [];
    expect(controllers).toContain(TaskController);
  });

  it('should have correct module structure', () => {
    const moduleMetadata = {
      controllers: [TaskController],
      providers: expect.arrayContaining([
        TaskService,
        expect.any(Function), // TimerService
        expect.any(Function), // TaskStrategyFactory
        expect.any(Function), // TaskCreationFactory
        expect.any(Function), // ActiveProjectFindAllStrategy
        expect.objectContaining({
          provide: expect.any(String),
          useClass: expect.any(Function),
        }), // TaskCreator decorator
        expect.objectContaining({
          provide: expect.any(String),
          useClass: expect.any(Function),
        }), // TaskUpdater decorator
      ]),
      imports: expect.arrayContaining([
        expect.any(Object), // TypeOrmModule
      ]),
      exports: expect.arrayContaining([
        TaskService,
        expect.any(Function), // TimerService
        expect.any(Object), // TypeOrmModule
        expect.any(String), // TaskCreator
        expect.any(String), // TaskUpdater
      ]),
    };

    expect(TaskModule).toMatchObject(moduleMetadata);
  });
});