import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskCreationNotifierDecorator } from '../../../src/modules/tasks/decorators/task-creation-notifier.decorator';
import { TaskService } from '../../../src/modules/tasks/services/task.service';
import { TaskCreator } from '../../../src/modules/tasks/services/task-creator.abstract';
import { CreateTaskDto } from '../../../src/modules/tasks/dto/create-task.dto';
import { Task } from '../../../src/modules/tasks/entities/task.entity';
import { mockTaskFactory, mockCreateTaskDtoFactory } from '../../mocks/factory';

describe('TaskCreationNotifierDecorator', () => {
  let decorator: TaskCreationNotifierDecorator;
  let mockTaskCreator: Partial<TaskCreator>;
  let mockEventEmitter: Partial<EventEmitter2>;
  let mockTaskService: Partial<TaskService>;

  const mockUserId = 1;
  const mockTaskId = 1;

  beforeEach(async () => {
    mockTaskCreator = {
      create: jest.fn(),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    mockTaskService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskCreationNotifierDecorator,
        {
          provide: TaskService,
          useValue: mockTaskCreator, // Use mockTaskCreator as the TaskCreator
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    decorator = module.get<TaskCreationNotifierDecorator>(TaskCreationNotifierDecorator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call underlying task creator and emit event', async () => {
      const createTaskDto: CreateTaskDto = mockCreateTaskDtoFactory();
      const createdTask = mockTaskFactory({ id: mockTaskId, ...createTaskDto });

      (mockTaskCreator.create as jest.Mock).mockResolvedValue(createdTask);

      const result = await decorator.create(createTaskDto, mockUserId);

      expect(result).toEqual(createdTask);
      expect(mockTaskCreator.create).toHaveBeenCalledWith(createTaskDto, mockUserId);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('task.created', {
        task: createdTask,
        createdBy: mockUserId,
      });
    });

    it('should propagate errors from underlying task creator', async () => {
      const createTaskDto: CreateTaskDto = mockCreateTaskDtoFactory();
      const error = new Error('Creation failed');

      (mockTaskCreator.create as jest.Mock).mockRejectedValue(error);

      await expect(decorator.create(createTaskDto, mockUserId))
        .rejects.toThrow('Creation failed');
      
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should include all task data in event payload', async () => {
      const createTaskDto: CreateTaskDto = mockCreateTaskDtoFactory({
        title: 'Important Task',
        priority: 'alta' as any,
        status: 'em_andamento' as any,
      });
      const createdTask = mockTaskFactory({ 
        id: mockTaskId, 
        title: 'Important Task',
        priority: 'alta' as any,
        status: 'em_andamento' as any,
      });

      (mockTaskCreator.create as jest.Mock).mockResolvedValue(createdTask);

      await decorator.create(createTaskDto, mockUserId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('task.created', {
        task: expect.objectContaining({
          id: mockTaskId,
          title: 'Important Task',
          priority: 'alta',
          status: 'em_andamento',
        }),
        createdBy: mockUserId,
      });
    });

    it('should work with different user IDs', async () => {
      const createTaskDto: CreateTaskDto = mockCreateTaskDtoFactory();
      const createdTask = mockTaskFactory({ id: mockTaskId });
      const differentUserId = 42;

      (mockTaskCreator.create as jest.Mock).mockResolvedValue(createdTask);

      await decorator.create(createTaskDto, differentUserId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('task.created', {
        task: createdTask,
        createdBy: differentUserId,
      });
    });
  });
});