import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { TaskSchedulerService } from './scheduler.service';
import {
  RecurringTask,
  ScheduleType,
} from '../recurring-task/entities/recurring-task.entity';
import { Task } from '../tasks/entities/task.entity';
import { LockService } from './services/lock.service';
import { Status, PriorityLevel } from '../tasks/entities/enums';
import { User } from '../user/entities/user.entity';
import { Project } from '../project/entities/project.entity';

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
    count: jest.fn(),
  } as unknown as MockRepository<T>;
}

interface MockQueryRunner {
  connect: jest.Mock;
  startTransaction: jest.Mock;
  commitTransaction: jest.Mock;
  rollbackTransaction: jest.Mock;
  release: jest.Mock;
  manager: {
    save: jest.Mock;
  };
}

function createMockDataSource(): unknown {
  const queryRunner: MockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
    },
  };
  return {
    createQueryRunner: jest.fn().mockReturnValue(queryRunner),
  };
}

describe('TaskSchedulerService', () => {
  let service: TaskSchedulerService;
  let recurringTaskRepository: MockRepository<RecurringTask>;
  let taskRepository: MockRepository<Task>;
  let lockService: { acquire: jest.Mock; release: jest.Mock };
  let dataSourceMock: unknown;
  let queryRunner: MockQueryRunner;

  const mockRecurringTask: RecurringTask = {
    id: 1,
    name: 'Daily Task',
    templateData: {
      title: 'Task Title',
      description: 'Task Desc',
      priority: PriorityLevel.High,
      assignee_ids: [1],
      occupation_ids: [],
    },
    next_due_date: new Date('2099-01-01T00:00:00Z'),
    is_active: true,
    schedule_type: ScheduleType.INTERVAL,
    frequency_interval: '1 days',
    frequency_cron: null,
    userId: 1,
    projectId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: 1 } as User,
    project: { id: 1 } as Project,
    tasks: [],
  };

  beforeEach(async () => {
    recurringTaskRepository = createMockRepository<RecurringTask>();
    taskRepository = createMockRepository<Task>();
    lockService = { acquire: jest.fn(), release: jest.fn() };
    dataSourceMock = createMockDataSource();
    queryRunner = (
      dataSourceMock as { createQueryRunner: () => MockQueryRunner }
    ).createQueryRunner();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskSchedulerService,
        {
          provide: getRepositoryToken(RecurringTask),
          useValue: recurringTaskRepository,
        },
        { provide: getRepositoryToken(Task), useValue: taskRepository },
        { provide: LockService, useValue: lockService },
        { provide: getDataSourceToken(), useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get<TaskSchedulerService>(TaskSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCron', () => {
    it('should process recurring tasks when lock is acquired', async () => {
      lockService.acquire.mockResolvedValue(true);
      lockService.release.mockResolvedValue(undefined);
      recurringTaskRepository.find.mockResolvedValue([mockRecurringTask]);
      taskRepository.create.mockReturnValue({ id: 2 } as Task);
      queryRunner.manager.save.mockResolvedValue({ id: 2 } as Task);

      await service.handleCron();

      expect(lockService.acquire).toHaveBeenCalledWith(
        'process-recurring-tasks',
      );
      expect(recurringTaskRepository.find).toHaveBeenCalledWith({
        where: {
          is_active: true,
          next_due_date: LessThanOrEqual(expect.any(Date)),
        },
      });
      expect(lockService.release).toHaveBeenCalledWith(
        'process-recurring-tasks',
      );
    });

    it('should skip processing when lock is not acquired', async () => {
      lockService.acquire.mockResolvedValue(false);

      await service.handleCron();

      expect(lockService.acquire).toHaveBeenCalledWith(
        'process-recurring-tasks',
      );
      expect(recurringTaskRepository.find).not.toHaveBeenCalled();
      expect(lockService.release).not.toHaveBeenCalled();
    });

    it('should release lock even when processing throws', async () => {
      lockService.acquire.mockResolvedValue(true);
      recurringTaskRepository.find.mockRejectedValue(new Error('DB error'));
      lockService.release.mockResolvedValue(undefined);

      await service.handleCron();

      expect(lockService.release).toHaveBeenCalledWith(
        'process-recurring-tasks',
      );
    });

    it('should process cron schedule type', async () => {
      const cronTask: RecurringTask = {
        ...mockRecurringTask,
        schedule_type: ScheduleType.CRON,
        frequency_cron: '0 0 * * *',
        frequency_interval: null,
      };

      lockService.acquire.mockResolvedValue(true);
      lockService.release.mockResolvedValue(undefined);
      recurringTaskRepository.find.mockResolvedValue([cronTask]);
      taskRepository.create.mockReturnValue({ id: 2 } as Task);
      queryRunner.manager.save.mockResolvedValue({ id: 2 } as Task);

      await service.handleCron();

      expect(recurringTaskRepository.find).toHaveBeenCalled();
      expect(taskRepository.create).toHaveBeenCalled();
    });

    it('should process interval schedule type', async () => {
      lockService.acquire.mockResolvedValue(true);
      lockService.release.mockResolvedValue(undefined);
      recurringTaskRepository.find.mockResolvedValue([mockRecurringTask]);
      taskRepository.create.mockReturnValue({ id: 2 } as Task);
      queryRunner.manager.save.mockResolvedValue({ id: 2 } as Task);

      await service.handleCron();

      expect(recurringTaskRepository.find).toHaveBeenCalled();
      expect(taskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: mockRecurringTask.templateData.title,
          status: Status.ToDo,
        }),
      );
    });

    it('should rollback transaction on error during task processing', async () => {
      lockService.acquire.mockResolvedValue(true);
      lockService.release.mockResolvedValue(undefined);
      recurringTaskRepository.find.mockResolvedValue([mockRecurringTask]);
      queryRunner.manager.save.mockRejectedValue(new Error('Save error'));

      await service.handleCron();

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(lockService.release).toHaveBeenCalledWith(
        'process-recurring-tasks',
      );
    });
  });
});
