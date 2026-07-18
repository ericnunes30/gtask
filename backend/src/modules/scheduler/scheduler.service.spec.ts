import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaskSchedulerService } from './scheduler.service';
import {
  RecurringTask,
  ScheduleType,
} from '../recurring-task/entities/recurring-task.entity';
import { Task } from '../tasks/entities/task.entity';
import { LockService } from './services/lock.service';
import { Status } from '../tasks/entities/enums';

type MockRepository<T> = jest.Mocked<Repository<T>>;

function createMockRepository<T>(): MockRepository<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  } as unknown as MockRepository<T>;
}

describe('TaskSchedulerService', () => {
  let service: TaskSchedulerService;
  let dataSource: {
    createQueryRunner: jest.Mock;
  };
  let recurringTaskRepository: MockRepository<RecurringTask>;
  let taskRepository: MockRepository<Task>;
  let lockService: { acquire: jest.Mock; release: jest.Mock };
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: {
      save: jest.Mock;
    };
  };

  beforeEach(async () => {
    recurringTaskRepository = createMockRepository<RecurringTask>();
    taskRepository = createMockRepository<Task>();

    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        save: jest.fn().mockResolvedValue(undefined),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    lockService = {
      acquire: jest.fn(),
      release: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskSchedulerService,
        { provide: DataSource, useValue: dataSource },
        {
          provide: getRepositoryToken(RecurringTask),
          useValue: recurringTaskRepository,
        },
        { provide: getRepositoryToken(Task), useValue: taskRepository },
        { provide: LockService, useValue: lockService },
      ],
    }).compile();

    service = module.get<TaskSchedulerService>(TaskSchedulerService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCron', () => {
    it('should skip processing when lock is not acquired', async () => {
      lockService.acquire.mockResolvedValue(false);

      await service.handleCron();

      expect(lockService.acquire).toHaveBeenCalledWith(
        'process-recurring-tasks',
      );
      expect(lockService.release).not.toHaveBeenCalled();
      expect(recurringTaskRepository.find).not.toHaveBeenCalled();
    });

    it('should process due tasks and release lock on success', async () => {
      lockService.acquire.mockResolvedValue(true);
      recurringTaskRepository.find.mockResolvedValue([]);

      await service.handleCron();

      expect(lockService.acquire).toHaveBeenCalledWith(
        'process-recurring-tasks',
      );
      expect(recurringTaskRepository.find).toHaveBeenCalled();
      expect(lockService.release).toHaveBeenCalledWith(
        'process-recurring-tasks',
      );
    });

    it('should release lock even when processing throws', async () => {
      lockService.acquire.mockResolvedValue(true);
      recurringTaskRepository.find.mockRejectedValue(new Error('DB fail'));

      await service.handleCron();

      expect(lockService.release).toHaveBeenCalledWith(
        'process-recurring-tasks',
      );
    });
  });

  describe('processSingleTask via handleCron', () => {
    it('should create a new task from a recurring task template', async () => {
      lockService.acquire.mockResolvedValue(true);

      const recurringTask = {
        id: 1,
        projectId: 100,
        next_due_date: new Date(),
        schedule_type: ScheduleType.INTERVAL,
        frequency_interval: '1 days',
        frequency_cron: null,
        templateData: {
          title: 'Recurring task',
          description: 'Auto-generated',
          priority: 'medium',
          task_reviewer_id: 5,
        },
      } as unknown as RecurringTask;

      recurringTaskRepository.find.mockResolvedValue([recurringTask]);
      taskRepository.create.mockImplementation(
        (data) => ({ ...(data as object), id: 999 }) as Task,
      );
      queryRunner.manager.save.mockResolvedValue(undefined);

      await service.handleCron();

      expect(taskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Recurring task',
          project_id: 100,
          recurring_task_id: 1,
          task_reviewer_id: 5,
          status: Status.ToDo,
        }),
      );
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction when save fails', async () => {
      lockService.acquire.mockResolvedValue(true);

      const recurringTask = {
        id: 2,
        projectId: 100,
        next_due_date: new Date(),
        schedule_type: ScheduleType.INTERVAL,
        frequency_interval: '1 days',
        frequency_cron: null,
        templateData: {
          title: 'Task',
          description: 'D',
          priority: 'low',
          task_reviewer_id: 1,
        },
      } as unknown as RecurringTask;

      recurringTaskRepository.find.mockResolvedValue([recurringTask]);
      taskRepository.create.mockReturnValue({ id: 1 } as Task);
      queryRunner.manager.save.mockRejectedValue(new Error('Save failed'));

      await service.handleCron();

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('handleCron with no due tasks', () => {
    it('should skip processing and release lock when no due tasks', async () => {
      lockService.acquire.mockResolvedValue(true);
      recurringTaskRepository.find.mockResolvedValue([]);

      await service.handleCron();

      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
      expect(lockService.release).toHaveBeenCalled();
    });
  });

  describe('processSingleTask with assignee_ids', () => {
    it('should map assignee_ids to user objects on the new task', async () => {
      lockService.acquire.mockResolvedValue(true);

      const recurringTask = {
        id: 3,
        projectId: 100,
        next_due_date: new Date(),
        schedule_type: ScheduleType.INTERVAL,
        frequency_interval: '1 days',
        frequency_cron: null,
        templateData: {
          title: 'With users',
          description: 'D',
          priority: 'low',
          task_reviewer_id: 1,
          assignee_ids: [10, 20],
        },
      } as unknown as RecurringTask;

      recurringTaskRepository.find.mockResolvedValue([recurringTask]);

      let capturedTask: Task | undefined;
      taskRepository.create.mockImplementation((data) => {
        capturedTask = { ...(data as object) } as Task;
        return capturedTask;
      });
      queryRunner.manager.save.mockResolvedValue(undefined);

      await service.handleCron();

      expect(capturedTask?.users).toEqual([{ id: 10 }, { id: 20 }]);
    });
  });

  describe('processSingleTask template data with start_date and due_date', () => {
    it('should use template start_date and due_date when provided', async () => {
      lockService.acquire.mockResolvedValue(true);

      const startDate = '2026-01-01T00:00:00Z';
      const dueDate = '2026-02-01T00:00:00Z';

      const recurringTask = {
        id: 4,
        projectId: 100,
        next_due_date: new Date('2026-01-15T00:00:00Z'),
        schedule_type: ScheduleType.INTERVAL,
        frequency_interval: '1 days',
        frequency_cron: null,
        templateData: {
          title: 'With dates',
          description: 'D',
          priority: 'low',
          task_reviewer_id: 1,
          start_date: startDate,
          due_date: dueDate,
        },
      } as unknown as RecurringTask;

      recurringTaskRepository.find.mockResolvedValue([recurringTask]);

      let capturedTask: Task | undefined;
      taskRepository.create.mockImplementation((data) => {
        capturedTask = { ...(data as object) } as Task;
        return capturedTask;
      });
      queryRunner.manager.save.mockResolvedValue(undefined);

      await service.handleCron();

      expect(capturedTask?.start_date).toEqual(new Date(startDate));
      expect(capturedTask?.due_date).toEqual(new Date(dueDate));
    });
  });

  describe('calculateNextDueDate (private method)', () => {
    it('should add interval for INTERVAL schedule_type', () => {
      // Use a future base date to avoid recursive recalculation
      const futureBase = new Date();
      futureBase.setDate(futureBase.getDate() + 10);

      const recurringTask = {
        id: 1,
        next_due_date: futureBase,
        schedule_type: ScheduleType.INTERVAL,
        frequency_interval: '5 days',
        frequency_cron: null,
      } as unknown as RecurringTask;

      // Access private method via 'any'
      const result = (
        service as unknown as {
          calculateNextDueDate: (rt: RecurringTask) => { toJSDate: () => Date };
        }
      ).calculateNextDueDate(recurringTask);

      const resultDate = result.toJSDate();
      const expected = new Date(futureBase);
      expected.setDate(expected.getDate() + 5);
      expect(resultDate.getTime()).toBe(expected.getTime());
    });

    it('should use 7-day fallback for CRON with invalid expression', () => {
      const futureBase = new Date();
      futureBase.setDate(futureBase.getDate() + 10);

      const recurringTask = {
        id: 2,
        next_due_date: futureBase,
        schedule_type: ScheduleType.CRON,
        frequency_interval: null,
        frequency_cron: 'invalid cron',
      } as unknown as RecurringTask;

      const result = (
        service as unknown as {
          calculateNextDueDate: (rt: RecurringTask) => { toJSDate: () => Date };
        }
      ).calculateNextDueDate(recurringTask);

      const resultDate = result.toJSDate();
      const expected = new Date(futureBase);
      expected.setDate(expected.getDate() + 7);
      expect(resultDate.getTime()).toBe(expected.getTime());
    });

    it('should use 7-day fallback when schedule_type does not match', () => {
      const futureBase = new Date();
      futureBase.setDate(futureBase.getDate() + 10);

      const recurringTask = {
        id: 3,
        next_due_date: futureBase,
        schedule_type: 'unknown' as unknown as ScheduleType,
        frequency_interval: null,
        frequency_cron: null,
      } as unknown as RecurringTask;

      const result = (
        service as unknown as {
          calculateNextDueDate: (rt: RecurringTask) => { toJSDate: () => Date };
        }
      ).calculateNextDueDate(recurringTask);

      const resultDate = result.toJSDate();
      const expected = new Date(futureBase);
      expected.setDate(expected.getDate() + 7);
      expect(resultDate.getTime()).toBe(expected.getTime());
    });

    it('should successfully parse a valid CRON expression', () => {
      const futureBase = new Date();
      futureBase.setDate(futureBase.getDate() + 10);

      const recurringTask = {
        id: 4,
        next_due_date: futureBase,
        schedule_type: ScheduleType.CRON,
        frequency_interval: null,
        frequency_cron: '0 0 * * *', // Every day at midnight
      } as unknown as RecurringTask;

      const result = (
        service as unknown as {
          calculateNextDueDate: (rt: RecurringTask) => { toJSDate: () => Date };
        }
      ).calculateNextDueDate(recurringTask);

      const resultDate = result.toJSDate();
      expect(resultDate.getTime()).toBeGreaterThan(futureBase.getTime());
    });
  });
});
