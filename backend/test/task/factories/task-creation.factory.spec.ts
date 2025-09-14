import { DefaultTaskCreationStrategy, TaskCreationFactory } from '../../src/modules/tasks/factories/task-creation.factory';
import { Repository } from 'typeorm';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { CreateTaskDto } from '../../src/modules/tasks/dto/create-task.dto';
import { mockCreateTaskDtoFactory, mockTaskFactory } from '../mocks/factory';
import { Status, PriorityLevel } from '../../src/modules/tasks/entities/enums';

describe('TaskCreationFactory', () => {
  describe('DefaultTaskCreationStrategy', () => {
    let strategy: DefaultTaskCreationStrategy;
    let mockRepository: Partial<Repository<Task>>;

    beforeEach(() => {
      strategy = new DefaultTaskCreationStrategy();
      mockRepository = {
        create: jest.fn(),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('canHandle', () => {
      it('should always return true (fallback strategy)', () => {
        const dto = mockCreateTaskDtoFactory();
        expect(strategy.canHandle(dto)).toBe(true);
      });
    });

    describe('create', () => {
      it('should create task with basic data', () => {
        const dto = mockCreateTaskDtoFactory();
        const taskData = { ...dto };
        const expectedTask = mockTaskFactory(taskData);

        (mockRepository.create as jest.Mock).mockReturnValue(expectedTask);

        const result = strategy.create(dto, mockRepository as Repository<Task>);

        expect(result).toEqual(expectedTask);
        expect(mockRepository.create).toHaveBeenCalledWith(taskData);
      });

      it('should separate relation fields from task data', () => {
        const dto = mockCreateTaskDtoFactory({
          users: [1, 2],
          occupations: [1],
        });

        const expectedTaskData = { ...dto };
        delete expectedTaskData.users;
        delete expectedTaskData.occupations;

        const expectedTask = mockTaskFactory(expectedTaskData);
        (mockRepository.create as jest.Mock).mockReturnValue(expectedTask);

        const result = strategy.create(dto, mockRepository as Repository<Task>);

        expect(result).toEqual(expectedTask);
        expect(mockRepository.create).toHaveBeenCalledWith(expectedTaskData);
      });

      it('should apply default timer when timer is null', () => {
        const dto = mockCreateTaskDtoFactory({ timer: 3600 });
        const expectedTask = mockTaskFactory({ ...dto, timer: 3600 });

        (mockRepository.create as jest.Mock).mockReturnValue(expectedTask);

        const result = strategy.create(dto, mockRepository as Repository<Task>);

        expect((result as any).timer).toBe(3600);
      });

      it('should apply default timer when timer is undefined', () => {
        const dto = mockCreateTaskDtoFactory();
        delete (dto as any).timer;
        const expectedTask = mockTaskFactory({ ...dto, timer: 0 });

        (mockRepository.create as jest.Mock).mockReturnValue(expectedTask);

        const result = strategy.create(dto, mockRepository as Repository<Task>);

        expect((result as any).timer).toBe(0);
      });
    });
  });

  describe('TaskCreationFactory', () => {
    let factory: TaskCreationFactory;
    let mockRepository: Partial<Repository<Task>>;

    beforeEach(() => {
      factory = new TaskCreationFactory();
      mockRepository = {
        create: jest.fn(),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('createTask', () => {
      it('should create task using appropriate strategy', () => {
        const dto = mockCreateTaskDtoFactory();
        const expectedTask = mockTaskFactory(dto);

        // Mock the strategy's create method
        const strategySpy = jest.spyOn(factory['strategies'][0], 'create')
          .mockReturnValue(expectedTask);

        const result = factory.createTask(dto, mockRepository as Repository<Task>);

        expect(result).toEqual(expectedTask);
        expect(strategySpy).toHaveBeenCalledWith(dto, mockRepository as Repository<Task>);
      });

      it('should call canHandle on each strategy to find appropriate one', () => {
        const dto = mockCreateTaskDtoFactory();
        
        const canHandleSpy1 = jest.spyOn(factory['strategies'][0], 'canHandle')
          .mockReturnValue(true);

        factory.createTask(dto, mockRepository as Repository<Task>);

        expect(canHandleSpy1).toHaveBeenCalledWith(dto);
      });

      it('should throw error when no strategy can handle the DTO', () => {
        const dto = mockCreateTaskDtoFactory({ title: 'Special Task' });
        
        // Mock that no strategy can handle this DTO
        jest.spyOn(factory['strategies'][0], 'canHandle').mockReturnValue(false);

        expect(() => {
          factory.createTask(dto, mockRepository as Repository<Task>);
        }).toThrow('No creation strategy found for task: Special Task');
      });

      it('should use first available strategy when multiple strategies can handle DTO', () => {
        const dto = mockCreateTaskDtoFactory();
        const expectedTask = mockTaskFactory(dto);

        // Mock both strategies can handle, but first one should be used
        jest.spyOn(factory['strategies'][0], 'canHandle').mockReturnValue(true);
        jest.spyOn(factory['strategies'][0], 'create').mockReturnValue(expectedTask);

        const result = factory.createTask(dto, mockRepository as Repository<Task>);

        expect(result).toEqual(expectedTask);
      });
    });

    describe('strategy initialization', () => {
      it('should initialize strategies correctly', () => {
        expect(factory['strategies']).toHaveLength(1);
        expect(factory['strategies'][0]).toBeInstanceOf(DefaultTaskCreationStrategy);
      });
    });
  });
});