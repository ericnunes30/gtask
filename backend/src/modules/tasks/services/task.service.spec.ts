import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository, In } from 'typeorm';
import { TaskService } from './task.service';
import { Task } from '../entities/task.entity';
import { User } from '../../user/entities/user.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { Project } from '../../project/entities/project.entity';
import { ActiveProjectFindAllStrategy } from '../strategies/active-project-find-all.strategy';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskCommentsHelper } from '../helpers/task-comments.helper';
import { TaskNotFoundException } from '../exceptions/task-not-found.exception';

type MockRepository<T> = jest.Mocked<Repository<T>>;

function createMockRepository<T>(): MockRepository<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    manager: {
      connection: {},
      find: jest.fn(),
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn(),
      }),
    } as unknown as Repository<T>['manager'],
  } as unknown as MockRepository<T>;
}

describe('TaskService', () => {
  let service: TaskService;
  let taskRepository: MockRepository<Task>;
  let userRepository: MockRepository<User>;
  let occupationRepository: MockRepository<Occupation>;
  let activeProjectFindAllStrategy: { execute: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  const mockTask = {
    id: 1,
    title: 'Task One',
    description: 'Desc',
    status: 'todo',
    timer: 0,
    users: [],
    occupations: [],
  } as unknown as Task;

  beforeEach(async () => {
    taskRepository = createMockRepository<Task>();
    userRepository = createMockRepository<User>();
    occupationRepository = createMockRepository<Occupation>();
    activeProjectFindAllStrategy = { execute: jest.fn() };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: getRepositoryToken(Task), useValue: taskRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: getRepositoryToken(Occupation),
          useValue: occupationRepository,
        },
        {
          provide: ActiveProjectFindAllStrategy,
          useValue: activeProjectFindAllStrategy,
        },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create task and emit task.created event', async () => {
      taskRepository.create.mockReturnValue(mockTask);
      taskRepository.save.mockResolvedValue(mockTask);

      const dto: CreateTaskDto = {
        title: 'Task One',
        description: 'Desc',
      } as CreateTaskDto;

      const result = await service.create(dto, 1);

      expect(result).toEqual(mockTask);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'task.created',
        expect.objectContaining({ createdBy: 1 }),
      );
    });

    it('should associate users and occupations', async () => {
      taskRepository.create.mockReturnValue(mockTask);
      taskRepository.save.mockResolvedValue(mockTask);
      userRepository.find.mockResolvedValue([{ id: 1 } as User]);
      occupationRepository.find.mockResolvedValue([{ id: 10 } as Occupation]);

      const dto: CreateTaskDto = {
        title: 'Task One',
        users: [1],
        occupations: [10],
      } as CreateTaskDto;

      await service.create(dto, 1);

      expect(userRepository.find).toHaveBeenCalledWith({
        where: { id: In([1]) },
      });
      expect(occupationRepository.find).toHaveBeenCalledWith({
        where: { id: In([10]) },
      });
    });
  });

  describe('findAll', () => {
    it('should return tasks from active project strategy', async () => {
      activeProjectFindAllStrategy.execute.mockResolvedValue([mockTask]);

      const result = await service.findAll();

      expect(result).toEqual([mockTask]);
      expect(activeProjectFindAllStrategy.execute).toHaveBeenCalledWith(
        taskRepository,
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should return task with all relations when found', async () => {
      const fullTask = {
        id: 1,
        title: 'Task One',
        description: 'Desc',
        status: 'todo',
        timer: 0,
        users: [{ id: 1 } as User],
        occupations: [{ id: 10 } as Occupation],
        project: { id: 100 } as Project,
        reviewer: { id: 2 } as User,
      } as Task;

      taskRepository.findOne.mockResolvedValue(fullTask);
      jest
        .spyOn(TaskCommentsHelper, 'fetchNestedComments')
        .mockResolvedValue([]);
      jest.spyOn(TaskCommentsHelper, 'fetchActivityLogs').mockResolvedValue([]);

      const result = await service.findOne(1);

      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          users: [{ id: 1 }],
          occupations: [{ id: 10 }],
          project: { id: 100 },
          reviewer: { id: 2 },
          comments: [],
          activityLogs: [],
        }),
      );
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['users', 'occupations', 'project', 'reviewer'],
      });
    });
  });

  describe('update', () => {
    it('should update task, emit events and detect changed fields', async () => {
      const oldTask = {
        id: 1,
        title: 'Task One',
        description: 'Desc',
        status: 'todo',
        timer: 0,
        users: [],
        occupations: [],
        project: { id: 100 } as Project,
        reviewer: { id: 2 } as User,
      } as Task;

      const taskForUpdate = {
        id: 1,
        title: 'Task One Updated',
        description: 'Desc Updated',
        status: 'in_progress',
        timer: 0,
        users: [{ id: 1 } as User],
        occupations: [{ id: 10 } as Occupation],
      } as Task;

      const fullTask = {
        ...taskForUpdate,
        project: { id: 100 } as Project,
        reviewer: { id: 2 } as User,
      } as Task;

      taskRepository.findOne
        .mockResolvedValueOnce(oldTask)
        .mockResolvedValueOnce(taskForUpdate)
        .mockResolvedValueOnce(fullTask);

      const mockUserRepo = {
        find: jest.fn().mockResolvedValue([{ id: 1 } as User]),
      };
      const mockOccupationRepo = {
        find: jest.fn().mockResolvedValue([{ id: 10 } as Occupation]),
      };
      taskRepository.manager.getRepository = jest
        .fn()
        .mockReturnValueOnce(mockUserRepo)
        .mockReturnValueOnce(mockOccupationRepo);

      taskRepository.save.mockResolvedValue(taskForUpdate);

      jest
        .spyOn(TaskCommentsHelper, 'fetchNestedComments')
        .mockResolvedValue([]);
      jest.spyOn(TaskCommentsHelper, 'fetchActivityLogs').mockResolvedValue([]);

      const dto: UpdateTaskDto = {
        title: 'Task One Updated',
        description: 'Desc Updated',
        status: 'in_progress',
        users: [1],
        occupations: [10],
      };

      const result = await service.update(1, dto, 99);

      expect(result).toEqual(taskForUpdate);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'task.updated',
        expect.objectContaining({
          task: fullTask,
          updatedBy: 99,
          changedFields: expect.objectContaining({
            title: { oldValue: 'Task One', newValue: 'Task One Updated' },
            description: { oldValue: 'Desc', newValue: 'Desc Updated' },
            status: { oldValue: 'todo', newValue: 'in_progress' },
          }),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'task.status.changed',
        expect.objectContaining({
          task: fullTask,
          updatedBy: 99,
          oldStatus: 'todo',
          newStatus: 'in_progress',
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'task.assignees.updated',
        expect.objectContaining({
          task: taskForUpdate,
          updatedBy: 99,
          action: 'set',
          userIds: [1],
        }),
      );
    });
  });

  describe('findByProject', () => {
    it('should return tasks filtered by project', async () => {
      taskRepository.find.mockResolvedValue([mockTask]);

      const result = await service.findByProject(100);

      expect(result).toEqual([mockTask]);
      expect(taskRepository.find).toHaveBeenCalledWith({
        where: { project_id: 100 },
        relations: ['project', 'reviewer', 'users', 'occupations'],
      });
    });
  });

  describe('findByStatus', () => {
    it('should return tasks filtered by status', async () => {
      taskRepository.find.mockResolvedValue([mockTask]);

      const result = await service.findByStatus('todo');

      expect(result).toEqual([mockTask]);
      expect(taskRepository.find).toHaveBeenCalledWith({
        where: { status: 'todo' },
        relations: ['project', 'reviewer', 'users', 'occupations'],
      });
    });
  });

  describe('assignUsers', () => {
    it('should assign users to task and return updated task', async () => {
      const task = { id: 1, users: [] } as Task;
      const taskWithUsers = { id: 1, users: [{ id: 1 } as User] } as Task;

      taskRepository.findOne
        .mockResolvedValueOnce(task)
        .mockResolvedValueOnce(taskWithUsers);

      userRepository.find.mockResolvedValue([{ id: 1 } as User]);
      taskRepository.save.mockResolvedValue(taskWithUsers);

      const result = await service.assignUsers(1, [1]);

      expect(userRepository.find).toHaveBeenCalledWith({
        where: { id: In([1]) },
      });
      expect(taskRepository.save).toHaveBeenCalledWith(task);
      expect(result.users).toEqual([{ id: 1 }]);
    });

    it('should throw TaskNotFoundException when task does not exist', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.assignUsers(999, [1])).rejects.toThrow(
        TaskNotFoundException,
      );
    });
  });

  describe('updateTimer', () => {
    it('should update task timer', async () => {
      taskRepository.findOne.mockResolvedValue(mockTask);
      taskRepository.save.mockResolvedValue({ ...mockTask, timer: 120 });

      const result = await service.updateTimer(1, 120);

      expect(result.timer).toBe(120);
      expect(taskRepository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove task when found', async () => {
      taskRepository.findOne.mockResolvedValue(mockTask);

      await service.remove(1);

      expect(taskRepository.remove).toHaveBeenCalledWith(mockTask);
    });
  });
});
