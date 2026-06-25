import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository, In } from 'typeorm';
import { TaskService } from './task.service';
import { Task } from '../entities/task.entity';
import { User } from '../../user/entities/user.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { ActiveProjectFindAllStrategy } from '../strategies/active-project-find-all.strategy';
import { CreateTaskDto } from '../dto/create-task.dto';

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
