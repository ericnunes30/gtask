import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RecurringTaskService } from './recurring-task.service';
import { RecurringTask, ScheduleType } from '../entities/recurring-task.entity';
import { OccupationEnhancer } from '../enhancers/occupation-enhancer';
import { CreateRecurringTaskDto } from '../dto/create-recurring-task.dto';
import { UpdateRecurringTaskDto } from '../dto/update-recurring-task.dto';
import { PriorityLevel } from '../../tasks/entities/enums';
import { User } from '../../user/entities/user.entity';
import { Project } from '../../project/entities/project.entity';

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

describe('RecurringTaskService', () => {
  let service: RecurringTaskService;
  let repository: MockRepository<RecurringTask>;
  let occupationEnhancer: {
    enhance: jest.Mock;
    enhanceMany: jest.Mock;
  };

  function createMockRecurringTask(): RecurringTask {
    return {
      id: 1,
      name: 'Daily Report',
      templateData: {
        title: 'Report',
        description: 'Daily report',
        priority: PriorityLevel.High,
        assignee_ids: [1],
        occupation_ids: [1, 2],
      },
      next_due_date: new Date('2024-01-01T00:00:00Z'),
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
  }

  beforeEach(async () => {
    repository = createMockRepository<RecurringTask>();
    occupationEnhancer = { enhance: jest.fn(), enhanceMany: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringTaskService,
        { provide: getRepositoryToken(RecurringTask), useValue: repository },
        { provide: OccupationEnhancer, useValue: occupationEnhancer },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<RecurringTaskService>(RecurringTaskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all recurring tasks enhanced', async () => {
      const mockRecurringTask = createMockRecurringTask();
      repository.find.mockResolvedValue([mockRecurringTask]);
      occupationEnhancer.enhanceMany.mockResolvedValue([mockRecurringTask]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        relations: ['user', 'project'],
      });
      expect(occupationEnhancer.enhanceMany).toHaveBeenCalledWith([
        mockRecurringTask,
      ]);
      expect(result).toEqual([mockRecurringTask]);
    });
  });

  describe('findOne', () => {
    it('should return recurring task when found', async () => {
      const mockRecurringTask = createMockRecurringTask();
      repository.findOne.mockResolvedValue(mockRecurringTask);
      occupationEnhancer.enhance.mockResolvedValue(mockRecurringTask);

      const result = await service.findOne(1);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['user', 'project'],
      });
      expect(result).toEqual(mockRecurringTask);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and save recurring task', async () => {
      const dto: CreateRecurringTaskDto = {
        name: 'Daily Report',
        schedule_type: ScheduleType.INTERVAL,
        frequency_interval: '1 days',
        projectId: 1,
        templateData: {
          title: 'Report',
          description: 'Daily report',
          priority: PriorityLevel.High,
          assignee_ids: [1],
          occupation_ids: [1, 2],
        },
      };

      const mockRecurringTask = createMockRecurringTask();
      repository.create.mockReturnValue(mockRecurringTask);
      repository.save.mockResolvedValue(mockRecurringTask);
      occupationEnhancer.enhance.mockResolvedValue(mockRecurringTask);

      const result = await service.create(dto, 1);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: dto.name,
          schedule_type: dto.schedule_type,
          userId: 1,
          projectId: dto.projectId,
        }),
      );
      expect(repository.save).toHaveBeenCalledWith(mockRecurringTask);
      expect(result).toEqual(mockRecurringTask);
    });

    it('should use default values when optional fields are omitted', async () => {
      const dto: CreateRecurringTaskDto = {
        name: 'Weekly Task',
        schedule_type: ScheduleType.CRON,
        projectId: 2,
        templateData: {
          title: 'Weekly',
          priority: PriorityLevel.Medium,
          assignee_ids: [1],
          occupation_ids: [],
        },
      };

      const created: RecurringTask = {
        ...createMockRecurringTask(),
        name: 'Weekly Task',
        schedule_type: ScheduleType.CRON,
        frequency_cron: null,
        frequency_interval: null,
        is_active: true,
      };

      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);
      occupationEnhancer.enhance.mockResolvedValue(created);

      await service.create(dto, 2);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: true,
          frequency_interval: null,
          frequency_cron: null,
        }),
      );
    });
  });

  describe('update', () => {
    it('should update recurring task', async () => {
      const dto: UpdateRecurringTaskDto = {
        name: 'Updated Name',
      };

      const mockRecurringTask = createMockRecurringTask();
      repository.findOne.mockResolvedValue(mockRecurringTask);
      repository.save.mockResolvedValue({
        ...mockRecurringTask,
        name: 'Updated Name',
      });
      occupationEnhancer.enhance.mockResolvedValue({
        ...mockRecurringTask,
        name: 'Updated Name',
      });

      const result = await service.update(1, dto);

      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated Name');
    });

    it('should update next_due_date when provided', async () => {
      const newDate = new Date('2024-12-01');
      const dto: UpdateRecurringTaskDto = {
        next_due_date: newDate.toISOString(),
      };

      const mockRecurringTask = createMockRecurringTask();
      repository.findOne.mockResolvedValue(mockRecurringTask);
      repository.save.mockResolvedValue({
        ...mockRecurringTask,
        next_due_date: newDate,
      });
      occupationEnhancer.enhance.mockResolvedValue({
        ...mockRecurringTask,
        next_due_date: newDate,
      });

      const result = await service.update(1, dto);

      expect(result.next_due_date).toEqual(newDate);
    });

    it('should update templateData occupation_ids', async () => {
      const dto: UpdateRecurringTaskDto = {
        templateData: {
          occupation_ids: [3, 4],
        },
      };

      const mockRecurringTask = createMockRecurringTask();
      repository.findOne.mockResolvedValue(mockRecurringTask);
      repository.save.mockResolvedValue(mockRecurringTask);
      occupationEnhancer.enhance.mockResolvedValue(mockRecurringTask);

      await service.update(1, dto);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            occupation_ids: [3, 4],
          }),
        }),
      );
    });

    it('should update is_active', async () => {
      const dto: UpdateRecurringTaskDto = {
        is_active: false,
      };

      const mockRecurringTask = createMockRecurringTask();
      repository.findOne.mockResolvedValue(mockRecurringTask);
      repository.save.mockResolvedValue({
        ...mockRecurringTask,
        is_active: false,
      });
      occupationEnhancer.enhance.mockResolvedValue({
        ...mockRecurringTask,
        is_active: false,
      });

      const result = await service.update(1, dto);

      expect(result.is_active).toBe(false);
    });
  });

  describe('create error paths', () => {
    it('should log Error.stack and rethrow when save fails with Error', async () => {
      const dto: CreateRecurringTaskDto = {
        name: 'Failing Task',
        schedule_type: ScheduleType.INTERVAL,
        frequency_interval: '1 days',
        projectId: 1,
        templateData: {
          title: 'Report',
          description: 'Daily report',
          priority: PriorityLevel.High,
          assignee_ids: [1],
          occupation_ids: [1, 2],
        },
      };

      const mockRecurringTask = createMockRecurringTask();
      repository.create.mockReturnValue(mockRecurringTask);
      const saveError = new Error('Database down');
      repository.save.mockRejectedValue(saveError);

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await expect(service.create(dto, 1)).rejects.toThrow('Database down');
      expect(errorSpy).toHaveBeenCalledWith(
        'Erro capturado no RecurringTaskService',
        saveError.stack,
      );
    });

    it('should log String(error) and rethrow when save fails with non-Error', async () => {
      const dto: CreateRecurringTaskDto = {
        name: 'Failing Task',
        schedule_type: ScheduleType.INTERVAL,
        frequency_interval: '1 days',
        projectId: 1,
        templateData: {
          title: 'Report',
          description: 'Daily report',
          priority: PriorityLevel.High,
          assignee_ids: [1],
          occupation_ids: [1, 2],
        },
      };

      const mockRecurringTask = createMockRecurringTask();
      repository.create.mockReturnValue(mockRecurringTask);
      repository.save.mockRejectedValue('unexpected string' as never);

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await expect(service.create(dto, 1)).rejects.toBe('unexpected string');
      expect(errorSpy).toHaveBeenCalledWith(
        'Erro capturado no RecurringTaskService',
        'unexpected string',
      );
    });
  });

  describe('remove', () => {
    it('should remove recurring task when found', async () => {
      const mockRecurringTask = createMockRecurringTask();
      repository.findOne.mockResolvedValue(mockRecurringTask);
      occupationEnhancer.enhance.mockResolvedValue(mockRecurringTask);
      repository.remove.mockResolvedValue(mockRecurringTask);

      await service.remove(1);

      expect(repository.remove).toHaveBeenCalledWith(mockRecurringTask);
    });

    it('should throw NotFoundException when task not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
