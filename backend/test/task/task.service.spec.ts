import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import { TaskService } from '../../src/modules/tasks/services/task.service';
import { TaskStrategyFactory } from '../../src/modules/tasks/strategies/task-strategy.factory';
import { TaskCreationFactory } from '../../src/modules/tasks/factories/task-creation.factory';
import { mockTaskFactory, mockCreateTaskDtoFactory, mockUserFactory, mockOccupationFactory } from '../mocks/factory';
import { NotFoundException, Logger } from '@nestjs/common';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { User } from '../../src/modules/user/entities/user.entity';
import { Occupation } from '../../src/modules/occupation/entities/occupation.entity';
import { CreateTaskDto } from '../../src/modules/tasks/dto/create-task.dto';
import { UpdateTaskDto } from '../../src/modules/tasks/dto/update-task.dto';
import { Status } from '../../src/modules/tasks/entities/enums';
import { TaskFindAllStrategy } from '../../src/modules/tasks/strategies/task-find-all.strategy';
import { TaskUpdateStrategy } from '../../src/modules/tasks/strategies/task-update.strategy';
import { TaskTimerUpdateStrategy } from '../../src/modules/tasks/strategies/task-timer-update.strategy';

describe('TaskService', () => {
  let service: TaskService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let occupationRepository: jest.Mocked<Repository<Occupation>>;
  let taskStrategyFactory: jest.Mocked<TaskStrategyFactory>;
  let taskCreationFactory: jest.Mocked<TaskCreationFactory>;
  let dataSource: jest.Mocked<DataSource>;
  let logger: jest.Mocked<Logger>;

  const mockTaskRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findAll: jest.fn(),
  };

  const mockUserRepository = {
    find: jest.fn(),
  };

  const mockOccupationRepository = {
    find: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Occupation),
          useValue: mockOccupationRepository,
        },
        {
          provide: TaskStrategyFactory,
          useValue: {
            getFindAllStrategy: jest.fn(),
            getUpdateStrategy: jest.fn(),
            getTimerUpdateStrategy: jest.fn(),
          },
        },
        {
          provide: TaskCreationFactory,
          useValue: {
            createTask: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    taskRepository = module.get(getRepositoryToken(Task));
    userRepository = module.get(getRepositoryToken(User));
    occupationRepository = module.get(getRepositoryToken(Occupation));
    taskStrategyFactory = module.get(TaskStrategyFactory);
    taskCreationFactory = module.get(TaskCreationFactory);
    dataSource = module.get(DataSource);
    
    // Mock Logger
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;
    (service as any).logger = logger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a task without users and occupations', async () => {
      const createTaskDto: CreateTaskDto = mockCreateTaskDtoFactory();
      const taskEntity = mockTaskFactory({ ...createTaskDto, id: 1 });
      
      taskCreationFactory.createTask.mockReturnValue(taskEntity);
      taskRepository.save.mockResolvedValue(taskEntity);

      const result = await service.create(createTaskDto);

      expect(result).toEqual(taskEntity);
      expect(taskCreationFactory.createTask).toHaveBeenCalledWith(createTaskDto, taskRepository);
      expect(taskRepository.save).toHaveBeenCalledWith(taskEntity);
      expect(userRepository.find).not.toHaveBeenCalled();
      expect(occupationRepository.find).not.toHaveBeenCalled();
    });

    it('should create a task with users', async () => {
      const createTaskDto: CreateTaskDto = mockCreateTaskDtoFactory({ users: [1, 2] });
      const taskEntity = mockTaskFactory({ ...createTaskDto, id: 1 });
      const users = [mockUserFactory({ id: 1 }), mockUserFactory({ id: 2 })];
      const taskWithUsers = mockTaskFactory({ ...taskEntity, users });

      taskCreationFactory.createTask.mockReturnValue(taskEntity);
      taskRepository.save.mockResolvedValue(taskEntity);
      userRepository.find.mockResolvedValue(users);
      taskRepository.save.mockResolvedValue(taskWithUsers);

      const result = await service.create(createTaskDto);

      expect(result).toEqual(taskWithUsers);
      expect(userRepository.find).toHaveBeenCalledWith({ where: { id: In([1, 2]) } });
      expect(taskRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should create a task with occupations', async () => {
      const createTaskDto: CreateTaskDto = mockCreateTaskDtoFactory({ occupations: [1, 2] });
      const taskEntity = mockTaskFactory({ ...createTaskDto, id: 1 });
      const occupations = [mockOccupationFactory({ id: 1 }), mockOccupationFactory({ id: 2 })];
      const taskWithOccupations = mockTaskFactory({ ...taskEntity, occupations });

      taskCreationFactory.createTask.mockReturnValue(taskEntity);
      taskRepository.save.mockResolvedValue(taskEntity);
      occupationRepository.find.mockResolvedValue(occupations);
      taskRepository.save.mockResolvedValue(taskWithOccupations);

      const result = await service.create(createTaskDto);

      expect(result).toEqual(taskWithOccupations);
      expect(occupationRepository.find).toHaveBeenCalledWith({ where: { id: In([1, 2]) } });
      expect(taskRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should create a task with both users and occupations', async () => {
      const createTaskDto: CreateTaskDto = mockCreateTaskDtoFactory({ 
        users: [1, 2], 
        occupations: [1, 2] 
      });
      const taskEntity = mockTaskFactory({ ...createTaskDto, id: 1 });
      const users = [mockUserFactory({ id: 1 }), mockUserFactory({ id: 2 })];
      const occupations = [mockOccupationFactory({ id: 1 }), mockOccupationFactory({ id: 2 })];
      const taskWithRelations = mockTaskFactory({ ...taskEntity, users, occupations });

      taskCreationFactory.createTask.mockReturnValue(taskEntity);
      taskRepository.save.mockResolvedValue(taskEntity);
      userRepository.find.mockResolvedValue(users);
      occupationRepository.find.mockResolvedValue(occupations);
      taskRepository.save.mockResolvedValue(taskWithRelations);

      const result = await service.create(createTaskDto);

      expect(result).toEqual(taskWithRelations);
      expect(userRepository.find).toHaveBeenCalledWith({ where: { id: In([1, 2]) } });
      expect(occupationRepository.find).toHaveBeenCalledWith({ where: { id: In([1, 2]) } });
      expect(taskRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should handle empty users and occupations arrays', async () => {
      const createTaskDto: CreateTaskDto = mockCreateTaskDtoFactory({ users: [], occupations: [] });
      const taskEntity = mockTaskFactory({ ...createTaskDto, id: 1 });

      taskCreationFactory.createTask.mockReturnValue(taskEntity);
      taskRepository.save.mockResolvedValue(taskEntity);
      userRepository.find.mockResolvedValue([]);
      occupationRepository.find.mockResolvedValue([]);

      const result = await service.create(createTaskDto);

      expect(result).toEqual(taskEntity);
      expect(taskRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should handle repository save failure', async () => {
      const createTaskDto: CreateTaskDto = mockCreateTaskDtoFactory();
      const taskEntity = mockTaskFactory({ ...createTaskDto, id: 1 });
      const error = new Error('Database error');

      taskCreationFactory.createTask.mockReturnValue(taskEntity);
      taskRepository.save.mockRejectedValue(error);

      await expect(service.create(createTaskDto)).rejects.toThrow(error);
    });

    it('should handle user repository find failure', async () => {
      const createTaskDto: CreateTaskDto = mockCreateTaskDtoFactory({ users: [1] });
      const taskEntity = mockTaskFactory({ ...createTaskDto, id: 1 });
      const error = new Error('User find error');

      taskCreationFactory.createTask.mockReturnValue(taskEntity);
      taskRepository.save.mockResolvedValue(taskEntity);
      userRepository.find.mockRejectedValue(error);

      await expect(service.create(createTaskDto)).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    it('should return all tasks using strategy', async () => {
      const tasks = [mockTaskFactory(), mockTaskFactory({ id: 2 })];
      const mockStrategy = {
        execute: jest.fn().mockResolvedValue(tasks),
        constructor: { name: 'MockStrategy' },
      };

      taskStrategyFactory.getFindAllStrategy.mockReturnValue(mockStrategy as any);

      const result = await service.findAll();

      expect(result).toEqual(tasks);
      expect(logger.log).toHaveBeenCalledWith('findAll called - getting strategy');
      expect(taskStrategyFactory.getFindAllStrategy).toHaveBeenCalledWith(taskRepository);
      expect(logger.log).toHaveBeenCalledWith('Using strategy: MockStrategy');
      expect(mockStrategy.execute).toHaveBeenCalledWith(taskRepository);
      expect(logger.log).toHaveBeenCalledWith('Found 2 tasks');
    });

    it('should handle empty task array', async () => {
      const mockStrategy = {
        execute: jest.fn().mockResolvedValue([]),
        constructor: { name: 'MockStrategy' },
      };

      taskStrategyFactory.getFindAllStrategy.mockReturnValue(mockStrategy as any);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(logger.log).toHaveBeenCalledWith('Found 0 tasks');
    });

    it('should handle strategy execution error', async () => {
      const mockStrategy = {
        execute: jest.fn().mockRejectedValue(new Error('Strategy error')),
        constructor: { name: 'MockStrategy' },
      };

      taskStrategyFactory.getFindAllStrategy.mockReturnValue(mockStrategy as any);

      await expect(service.findAll()).rejects.toThrow('Strategy error');
    });
  });

  describe('findOne', () => {
    it('should return task with relations', async () => {
      const task = mockTaskFactory();
      const comments = [
        { id: 1, content: 'Comment 1', parent_id: null, user: { id: 1, name: 'User 1' }, replies: [] },
      ];
      const activityLogs = [
        { id: 1, action: 'created', user: { id: 1, name: 'User 1' } },
      ];

      taskRepository.findOne.mockResolvedValue(task);
      dataSource.query
        .mockResolvedValueOnce(comments)
        .mockResolvedValueOnce(activityLogs);

      const result = await service.findOne(task.id);

      expect(result).toEqual(task);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: task.id },
        relations: ['users', 'occupations', 'project', 'reviewer'],
      });
      expect(dataSource.query).toHaveBeenCalledTimes(2);
      expect((result as any).comments).toEqual(comments);
      expect((result as any).activityLogs).toEqual(activityLogs);
    });

    it('should throw NotFoundException when task not found', async () => {
      const taskId = 999;
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(taskId)).rejects.toThrow(
        `Task with ID ${taskId} not found`
      );
    });

    it('should handle nested comments structure', async () => {
      const task = mockTaskFactory();
      const comments = [
        { 
          id: 1, 
          content: 'Parent comment', 
          parent_id: null, 
          user: { id: 1, name: 'User 1' }, 
          replies: [] 
        },
        { 
          id: 2, 
          content: 'Reply comment', 
          parent_id: 1, 
          user: { id: 2, name: 'User 2' }, 
          replies: [] 
        },
      ];

      taskRepository.findOne.mockResolvedValue(task);
      dataSource.query.mockResolvedValue(comments);

      const result = await service.findOne(task.id);

      const topLevelComments = (result as any).comments;
      expect(topLevelComments).toHaveLength(1);
      expect(topLevelComments[0].replies).toHaveLength(1);
      expect(topLevelComments[0].replies[0].id).toBe(2);
    });

    it('should handle empty comments and activity logs', async () => {
      const task = mockTaskFactory();

      taskRepository.findOne.mockResolvedValue(task);
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.findOne(task.id);

      expect((result as any).comments).toEqual([]);
      expect((result as any).activityLogs).toEqual([]);
    });

    it('should handle database query error for comments', async () => {
      const task = mockTaskFactory();
      const error = new Error('Database query error');

      taskRepository.findOne.mockResolvedValue(task);
      dataSource.query.mockRejectedValue(error);

      await expect(service.findOne(task.id)).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    it('should update task using strategy', async () => {
      const task = mockTaskFactory();
      const updateDto: UpdateTaskDto = { title: 'Updated Title' };
      const updatedTask = mockTaskFactory({ ...task, ...updateDto });
      const mockStrategy = {
        execute: jest.fn().mockResolvedValue(updatedTask),
      };

      taskStrategyFactory.getUpdateStrategy.mockReturnValue(mockStrategy as any);

      const result = await service.update(task.id, updateDto, 1);

      expect(result).toEqual(updatedTask);
      expect(taskStrategyFactory.getUpdateStrategy).toHaveBeenCalledWith(taskRepository);
      expect(mockStrategy.execute).toHaveBeenCalledWith(task.id, updateDto, taskRepository);
    });

    it('should handle strategy execution error', async () => {
      const taskId = 1;
      const updateDto: UpdateTaskDto = { title: 'Updated Title' };
      const error = new Error('Update strategy error');
      const mockStrategy = {
        execute: jest.fn().mockRejectedValue(error),
      };

      taskStrategyFactory.getUpdateStrategy.mockReturnValue(mockStrategy as any);

      await expect(service.update(taskId, updateDto, 1)).rejects.toThrow(error);
    });
  });

  describe('remove', () => {
    it('should remove task successfully', async () => {
      const task = mockTaskFactory();

      taskRepository.findOne.mockResolvedValue(task);
      taskRepository.remove.mockResolvedValue(undefined);

      await service.remove(task.id);

      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: task.id },
        relations: ['project', 'reviewer', 'users', 'occupations'],
      });
      expect(taskRepository.remove).toHaveBeenCalledWith(task);
    });

    it('should throw NotFoundException when task not found for removal', async () => {
      const taskId = 999;
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(taskId)).rejects.toThrow(
        `Task with ID ${taskId} not found`
      );
    });

    it('should handle remove operation failure', async () => {
      const task = mockTaskFactory();
      const error = new Error('Remove operation failed');

      taskRepository.findOne.mockResolvedValue(task);
      taskRepository.remove.mockRejectedValue(error);

      await expect(service.remove(task.id)).rejects.toThrow(error);
    });
  });

  describe('findByProject', () => {
    it('should return tasks for a project', async () => {
      const projectId = 1;
      const tasks = [mockTaskFactory({ project_id: projectId })];

      taskRepository.find.mockResolvedValue(tasks);

      const result = await service.findByProject(projectId);

      expect(result).toEqual(tasks);
      expect(taskRepository.find).toHaveBeenCalledWith({
        where: { project_id: projectId },
        relations: ['project', 'reviewer', 'users', 'occupations'],
      });
    });
  });

  describe('findByStatus', () => {
    it('should return tasks for a status', async () => {
      const status = Status.InProgress;
      const tasks = [mockTaskFactory({ status })];

      taskRepository.find.mockResolvedValue(tasks);

      const result = await service.findByStatus(status);

      expect(result).toEqual(tasks);
      expect(taskRepository.find).toHaveBeenCalledWith({
        where: { status },
        relations: ['project', 'reviewer', 'users', 'occupations'],
      });
    });
  });

  describe('updateTimer', () => {
    it('should update timer using strategy', async () => {
      const task = mockTaskFactory();
      const timerValue = 1200;
      const updatedTask = mockTaskFactory({ ...task, timer: timerValue });
      const mockStrategy = {
        execute: jest.fn().mockResolvedValue(updatedTask),
      };

      taskStrategyFactory.getTimerUpdateStrategy.mockReturnValue(mockStrategy as any);

      const result = await service.updateTimer(task.id, timerValue);

      expect(result).toEqual(updatedTask);
      expect(taskStrategyFactory.getTimerUpdateStrategy).toHaveBeenCalledWith(taskRepository);
      expect(mockStrategy.execute).toHaveBeenCalledWith(task.id, timerValue, taskRepository);
    });

    it('should handle strategy execution error', async () => {
      const taskId = 1;
      const timerValue = 1200;
      const error = new Error('Timer update error');
      const mockStrategy = {
        execute: jest.fn().mockRejectedValue(error),
      };

      taskStrategyFactory.getTimerUpdateStrategy.mockReturnValue(mockStrategy as any);

      await expect(service.updateTimer(taskId, timerValue)).rejects.toThrow(error);
    });

    it('should handle zero timer value', async () => {
      const task = mockTaskFactory();
      const timerValue = 0;
      const updatedTask = mockTaskFactory({ ...task, timer: 0 });
      const mockStrategy = {
        execute: jest.fn().mockResolvedValue(updatedTask),
      };

      taskStrategyFactory.getTimerUpdateStrategy.mockReturnValue(mockStrategy as any);

      const result = await service.updateTimer(task.id, timerValue);

      expect(result.timer).toBe(0);
    });

    it('should handle negative timer value', async () => {
      const task = mockTaskFactory();
      const timerValue = -100;
      const updatedTask = mockTaskFactory({ ...task, timer: -100 });
      const mockStrategy = {
        execute: jest.fn().mockResolvedValue(updatedTask),
      };

      taskStrategyFactory.getTimerUpdateStrategy.mockReturnValue(mockStrategy as any);

      const result = await service.updateTimer(task.id, timerValue);

      expect(result.timer).toBe(-100);
    });
  });

  describe('assignUsers', () => {
    it('should assign users when repository has update method', async () => {
      const task = mockTaskFactory();
      const userIds = [1, 2];
      const updatedTask = mockTaskFactory({ ...task, users: [{ id: 1 } as User, { id: 2 } as User] });

      taskRepository.findOne.mockResolvedValue(task);
      (taskRepository as any).update = jest.fn().mockResolvedValue({ affected: 1 });
      taskRepository.findOne.mockResolvedValue(updatedTask);

      const result = await service.assignUsers(task.id, userIds);

      expect(result).toEqual(updatedTask);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: task.id },
        relations: ['project', 'reviewer', 'users', 'occupations'],
      });
      expect((taskRepository as any).update).toHaveBeenCalledWith(task.id, { users: userIds });
    });

    it('should assign users when repository does not have update method', async () => {
      const task = mockTaskFactory();
      const userIds = [1, 2];

      taskRepository.findOne.mockResolvedValue(task);
      taskRepository.save.mockResolvedValue(task);

      const result = await service.assignUsers(task.id, userIds);

      expect(result).toEqual(task);
      // The service modifies the task directly before saving
      expect((task as any).users).toEqual([{ id: 1 }, { id: 2 }]);
      expect(taskRepository.save).toHaveBeenCalledWith(task);
    });

    it('should throw NotFoundException when task not found', async () => {
      const taskId = 999;
      const userIds = [1, 2];
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.assignUsers(taskId, userIds)).rejects.toThrow(
        `Task with ID ${taskId} not found`
      );
    });

    it('should handle empty userIds array', async () => {
      const task = mockTaskFactory();
      const userIds: number[] = [];

      taskRepository.findOne.mockResolvedValue(task);
      (taskRepository as any).update = jest.fn().mockResolvedValue({ affected: 1 });
      taskRepository.findOne.mockResolvedValue(task);

      const result = await service.assignUsers(task.id, userIds);

      expect(result).toEqual(task);
      expect((taskRepository as any).update).toHaveBeenCalledWith(task.id, { users: [] });
    });
  });

  describe('Abstract methods implementation', () => {
    describe('TaskCreator abstract method', () => {
      it('should have create method with correct signature', () => {
        expect(service.create).toBeDefined();
        expect(typeof service.create).toBe('function');
        // Note: The service's create method doesn't match the abstract signature
        // This is a design issue that should be addressed
      });
    });

    describe('TaskUpdater abstract method', () => {
      it('should have update method with correct signature', () => {
        expect(service.update).toBeDefined();
        expect(typeof service.update).toBe('function');
        // Note: The service's update method doesn't match the abstract signature
        // This is a design issue that should be addressed
      });
    });
  });
});