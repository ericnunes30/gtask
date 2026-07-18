import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import {
  ActivityLogService,
  ActivityLogFilterOptions,
} from './activity-log.service';
import { ActivityLog } from '../entities/activity-log.entity';
import { User } from '../../user/entities/user.entity';
import { Task } from '../../tasks/entities/task.entity';

type MockRepository<T> = jest.Mocked<Repository<T>>;

function createMockRepository<T>(): MockRepository<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  } as unknown as MockRepository<T>;
}

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let repository: MockRepository<ActivityLog>;

  const mockUser = { id: 1, name: 'User One' } as User;
  const mockTask = { id: 1, title: 'Task One' } as Task;

  const mockActivityLog: ActivityLog = {
    id: 1,
    userId: 1,
    taskId: 1,
    actionType: 'created',
    changedField: null,
    oldValue: null,
    newValue: null,
    referenceId: null,
    details: null,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    user: mockUser,
    task: mockTask,
  };

  beforeEach(async () => {
    repository = createMockRepository<ActivityLog>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogService,
        { provide: getRepositoryToken(ActivityLog), useValue: repository },
      ],
    }).compile();

    service = module.get<ActivityLogService>(ActivityLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save activity log', async () => {
      const input = { actionType: 'created', taskId: 1, userId: 1 };
      repository.create.mockReturnValue(mockActivityLog);
      repository.save.mockResolvedValue(mockActivityLog);

      const result = await service.create(input);

      expect(repository.create).toHaveBeenCalledWith(input);
      expect(repository.save).toHaveBeenCalledWith(mockActivityLog);
      expect(result).toEqual(mockActivityLog);
    });
  });

  describe('findByTaskId', () => {
    it('should return paginated activity logs for a task', async () => {
      repository.find.mockResolvedValue([mockActivityLog]);

      const result = await service.findByTaskId(1, 1, 20);

      expect(repository.find).toHaveBeenCalledWith({
        where: { taskId: 1 },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result).toEqual([mockActivityLog]);
    });

    it('should use default pagination when not provided', async () => {
      repository.find.mockResolvedValue([mockActivityLog]);

      await service.findByTaskId(1);

      expect(repository.find).toHaveBeenCalledWith({
        where: { taskId: 1 },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('findRecentByTaskId', () => {
    it('should return recent activity logs for a task', async () => {
      repository.find.mockResolvedValue([mockActivityLog]);

      const result = await service.findRecentByTaskId(1, 10);

      expect(repository.find).toHaveBeenCalledWith({
        where: { taskId: 1 },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        take: 10,
      });
      expect(result).toEqual([mockActivityLog]);
    });
  });

  describe('countByTaskId', () => {
    it('should return count of activity logs for a task', async () => {
      repository.count.mockResolvedValue(5);

      const result = await service.countByTaskId(1);

      expect(repository.count).toHaveBeenCalledWith({
        where: { taskId: 1 },
      });
      expect(result).toBe(5);
    });
  });

  describe('findAll', () => {
    it('should return activity logs filtered by userId', async () => {
      repository.find.mockResolvedValue([mockActivityLog]);

      const filters: ActivityLogFilterOptions = { userId: 1 };
      const result = await service.findAll(filters);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 1 }),
          relations: ['user', 'task'],
          order: { createdAt: 'DESC' },
          skip: 0,
          take: 20,
        }),
      );
      expect(result).toEqual([mockActivityLog]);
    });

    it('should return activity logs filtered by taskId', async () => {
      repository.find.mockResolvedValue([mockActivityLog]);

      const filters: ActivityLogFilterOptions = { taskId: 1 };
      await service.findAll(filters);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ taskId: 1 }),
        }),
      );
    });

    it('should apply actionType filter with Like', async () => {
      repository.find.mockResolvedValue([mockActivityLog]);

      const filters: ActivityLogFilterOptions = { actionType: 'create' };
      await service.findAll(filters);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            actionType: Like('%create%'),
          }),
        }),
      );
    });

    it('should apply date range filter with Between', async () => {
      repository.find.mockResolvedValue([mockActivityLog]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const filters: ActivityLogFilterOptions = { startDate, endDate };
      await service.findAll(filters);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: Between(startDate, endDate),
          }),
        }),
      );
    });

    it('should apply startDate only filter', async () => {
      repository.find.mockResolvedValue([mockActivityLog]);

      const startDate = new Date('2024-01-01');
      const filters: ActivityLogFilterOptions = { startDate };
      await service.findAll(filters);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: Between(startDate, expect.any(Date)),
          }),
        }),
      );
    });

    it('should apply endDate only filter', async () => {
      repository.find.mockResolvedValue([mockActivityLog]);

      const endDate = new Date('2024-01-31');
      const filters: ActivityLogFilterOptions = { endDate };
      await service.findAll(filters);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: Between(expect.any(Date), endDate),
          }),
        }),
      );
    });

    it('should apply custom pagination', async () => {
      repository.find.mockResolvedValue([mockActivityLog]);

      const filters: ActivityLogFilterOptions = { page: 2, limit: 10 };
      await service.findAll(filters);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('should return all logs when no filters are provided (empty object)', async () => {
      repository.find.mockResolvedValue([mockActivityLog]);

      const result = await service.findAll({});

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          relations: ['user', 'task'],
          order: { createdAt: 'DESC' },
          skip: 0,
          take: 20,
        }),
      );
      expect(result).toEqual([mockActivityLog]);
    });

    it('should apply both taskId and userId filters together', async () => {
      repository.find.mockResolvedValue([mockActivityLog]);

      const filters: ActivityLogFilterOptions = { taskId: 1, userId: 2 };
      await service.findAll(filters);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ taskId: 1, userId: 2 }),
        }),
      );
    });
  });

  describe('findByTaskId', () => {
    it('should return empty array when no logs found for task', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findByTaskId(999, 1, 20);

      expect(result).toEqual([]);
    });
  });
});
