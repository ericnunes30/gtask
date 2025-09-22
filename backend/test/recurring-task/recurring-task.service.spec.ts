import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecurringTaskService } from '../../src/modules/recurring-task/services/recurring-task.service';
import { RecurringTask } from '../../src/modules/recurring-task/entities/recurring-task.entity';
import { Occupation } from '../../src/modules/occupation/entities/occupation.entity';
import { OccupationEnhancer } from '../../src/modules/recurring-task/enhancers/occupation-enhancer';
import { RecurringTaskCreationFactory } from '../../src/modules/recurring-task/factories/recurring-task-creation.factory';
import { RecurringTaskUpdateFactory } from '../../src/modules/recurring-task/factories/recurring-task-update.factory';
import { NotFoundException } from '@nestjs/common';
import { 
  mockRecurringTaskFactory, 
  mockCreateRecurringTaskDtoFactory, 
  mockRecurringTaskRepository,
  mockOccupationRepository
} from '../mocks/factory';
import { CreateRecurringTaskDto } from '../../src/modules/recurring-task/dto/create-recurring-task.dto';
import { UpdateRecurringTaskDto } from '../../src/modules/recurring-task/dto/update-recurring-task.dto';
import { ScheduleType } from '../../src/modules/recurring-task/entities/recurring-task.entity';
import { PriorityLevel } from '../../src/modules/tasks/entities/enums';

describe('RecurringTaskService', () => {
  let service: RecurringTaskService;
  let recurringTaskRepository: any;
  let occupationRepository: any;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringTaskService,
        {
          provide: getRepositoryToken(RecurringTask),
          useValue: mockRecurringTaskRepository,
        },
        {
          provide: getRepositoryToken(Occupation),
          useValue: mockOccupationRepository,
        },
        {
          provide: OccupationEnhancer,
          useValue: {
            enhance: jest.fn().mockImplementation(async (task) => {
              if (task.templateData.occupation_ids?.length > 0) {
                const occupations = await mockOccupationRepository.findByIds(task.templateData.occupation_ids);
                (task.templateData as any).occupations = occupations;
              }
              return task;
            }),
            enhanceMany: jest.fn().mockImplementation(async (tasks) => {
              const enhanced = [];
              for (const task of tasks) {
                if (task.templateData.occupation_ids?.length > 0) {
                  const occupations = await mockOccupationRepository.findByIds(task.templateData.occupation_ids);
                  (task.templateData as any).occupations = occupations;
                }
                enhanced.push(task);
              }
              return enhanced;
            })
          },
        },
        {
          provide: RecurringTaskCreationFactory,
          useValue: {
            createRecurringTask: jest.fn().mockImplementation((dto, repository) => {
              const task = repository.create({
                name: dto.name,
                templateData: {
                  ...dto.templateData,
                  occupation_ids: dto.templateData.occupation_ids,
                },
                next_due_date: dto.next_due_date ? new Date(dto.next_due_date) : new Date(),
                is_active: dto.is_active ?? true,
                schedule_type: dto.schedule_type,
                frequency_interval: dto.frequency_interval,
                frequency_cron: dto.frequency_cron,
                userId: dto.userId,
                projectId: dto.projectId,
              });
              return task;
            })
          },
        },
        {
          provide: RecurringTaskUpdateFactory,
          useValue: {
            updateRecurringTask: jest.fn().mockImplementation((task, dto) => {
              if (dto.next_due_date) {
                task.next_due_date = new Date(dto.next_due_date);
              }
              if (dto.templateData) {
                task.templateData = {
                  ...task.templateData,
                  ...dto.templateData,
                  occupation_ids: dto.templateData.occupation_ids || task.templateData.occupation_ids,
                };
              }
              Object.assign(task, {
                name: dto.name || task.name,
                is_active: dto.is_active ?? task.is_active,
                schedule_type: dto.schedule_type || task.schedule_type,
                frequency_interval: dto.frequency_interval || task.frequency_interval,
                frequency_cron: dto.frequency_cron || task.frequency_cron,
                userId: dto.userId || task.userId,
                projectId: dto.projectId || task.projectId,
              });
              return task;
            })
          },
        },
      ],
    }).compile();

    service = module.get<RecurringTaskService>(RecurringTaskService);
    recurringTaskRepository = module.get(getRepositoryToken(RecurringTask));
    occupationRepository = module.get(getRepositoryToken(Occupation));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of recurring tasks', async () => {
      const recurringTasks = [mockRecurringTaskFactory(), mockRecurringTaskFactory({ id: 2 })];
      recurringTaskRepository.find.mockResolvedValue(recurringTasks);

      const result = await service.findAll();
      
      expect(result).toEqual(recurringTasks);
      expect(recurringTaskRepository.find).toHaveBeenCalledWith({
        relations: ['user', 'project'],
      });
    });

    it('should load occupations when templateData has occupation_ids', async () => {
      const recurringTask = mockRecurringTaskFactory({
        templateData: {
          title: 'Test Task',
          priority: PriorityLevel.Medium,
          occupation_ids: [1, 2],
        }
      });
      recurringTaskRepository.find.mockResolvedValue([recurringTask]);
      occupationRepository.findByIds.mockResolvedValue([
        { id: 1, name: 'Developer' },
        { id: 2, name: 'Designer' }
      ]);

      const result = await service.findAll();
      
      expect(occupationRepository.findByIds).toHaveBeenCalledWith([1, 2]);
      expect((result[0].templateData as any).occupations).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should return a recurring task if found', async () => {
      const recurringTask = mockRecurringTaskFactory();
      recurringTaskRepository.findOne.mockResolvedValue(recurringTask);

      const result = await service.findOne(recurringTask.id);
      
      expect(result).toEqual(recurringTask);
      expect(recurringTaskRepository.findOne).toHaveBeenCalledWith({
        where: { id: recurringTask.id },
        relations: ['user', 'project'],
      });
    });

    it('should throw NotFoundException if recurring task is not found', async () => {
      const taskId = 999;
      recurringTaskRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(taskId)).rejects.toThrow(NotFoundException);
      expect(recurringTaskRepository.findOne).toHaveBeenCalledWith({
        where: { id: taskId },
        relations: ['user', 'project'],
      });
    });

    it('should load occupations when templateData has occupation_ids', async () => {
      const recurringTask = mockRecurringTaskFactory({
        templateData: {
          title: 'Test Task',
          priority: PriorityLevel.Medium,
          occupation_ids: [1],
        }
      });
      recurringTaskRepository.findOne.mockResolvedValue(recurringTask);
      occupationRepository.findByIds.mockResolvedValue([{ id: 1, name: 'Developer' }]);

      const result = await service.findOne(recurringTask.id);
      
      expect(occupationRepository.findByIds).toHaveBeenCalledWith([1]);
      expect((result.templateData as any).occupations).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create a new recurring task', async () => {
      const createDto: CreateRecurringTaskDto = mockCreateRecurringTaskDtoFactory();
      const createdTask = mockRecurringTaskFactory({ ...createDto, id: 1 });

      recurringTaskRepository.create.mockReturnValue(createdTask);
      recurringTaskRepository.save.mockResolvedValue(createdTask);
      occupationRepository.findByIds.mockResolvedValue([
        { id: 1, name: 'Developer' }
      ]);

      const result = await service.create(createDto);
      
      expect(recurringTaskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createDto.name,
          templateData: expect.objectContaining({
            title: createDto.templateData.title,
            priority: createDto.templateData.priority,
            occupation_ids: createDto.templateData.occupation_ids,
          }),
          next_due_date: new Date(createDto.next_due_date),
          is_active: createDto.is_active,
          schedule_type: createDto.schedule_type,
          frequency_interval: createDto.frequency_interval,
          frequency_cron: createDto.frequency_cron,
          userId: createDto.userId,
          projectId: createDto.projectId,
        })
      );
      expect(recurringTaskRepository.save).toHaveBeenCalledWith(createdTask);
      expect((result.templateData as any).occupations).toBeDefined();
    });

    it('should default is_active to true when not provided', async () => {
      const createDto: CreateRecurringTaskDto = mockCreateRecurringTaskDtoFactory({
        is_active: undefined,
      });
      const createdTask = mockRecurringTaskFactory({ ...createDto, is_active: true });

      recurringTaskRepository.create.mockReturnValue(createdTask);
      recurringTaskRepository.save.mockResolvedValue(createdTask);

      await service.create(createDto);
      
      expect(recurringTaskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: true })
      );
    });
  });

  describe('update', () => {
    it('should update a recurring task', async () => {
      const recurringTask = mockRecurringTaskFactory();
      const updateDto: UpdateRecurringTaskDto = {
        name: 'Updated Task',
        is_active: false,
      };
      const updatedTask = mockRecurringTaskFactory({ ...recurringTask, ...updateDto });

      recurringTaskRepository.findOne.mockResolvedValue(recurringTask);
      recurringTaskRepository.save.mockResolvedValue(updatedTask);

      const result = await service.update(recurringTask.id, updateDto);
      
      expect(result).toEqual(updatedTask);
      expect(recurringTaskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: updateDto.name,
          is_active: updateDto.is_active,
        })
      );
    });

    it('should update templateData when provided', async () => {
      const recurringTask = mockRecurringTaskFactory();
      const updateDto: UpdateRecurringTaskDto = {
        templateData: {
          title: 'Updated Template Title',
          priority: PriorityLevel.High,
        },
      };

      recurringTaskRepository.findOne.mockResolvedValue(recurringTask);
      recurringTaskRepository.save.mockResolvedValue(recurringTask);

      await service.update(recurringTask.id, updateDto);
      
      expect(recurringTaskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            title: 'Updated Template Title',
            priority: PriorityLevel.High,
          }),
        })
      );
    });

    it('should update next_due_date when provided', async () => {
      const recurringTask = mockRecurringTaskFactory();
      const newDate = '2024-12-25T00:00:00.000Z';
      const updateDto: UpdateRecurringTaskDto = {
        next_due_date: newDate,
      };

      recurringTaskRepository.findOne.mockResolvedValue(recurringTask);
      recurringTaskRepository.save.mockResolvedValue(recurringTask);

      await service.update(recurringTask.id, updateDto);
      
      expect(recurringTaskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          next_due_date: new Date(newDate),
        })
      );
    });
  });

  describe('remove', () => {
    it('should remove a recurring task', async () => {
      const recurringTask = mockRecurringTaskFactory();
      recurringTaskRepository.findOne.mockResolvedValue(recurringTask);
      recurringTaskRepository.remove.mockResolvedValue(undefined);

      await service.remove(recurringTask.id);
      
      expect(recurringTaskRepository.remove).toHaveBeenCalledWith(recurringTask);
    });

    it('should throw NotFoundException if recurring task is not found', async () => {
      const taskId = 999;
      recurringTaskRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(taskId)).rejects.toThrow(NotFoundException);
      expect(recurringTaskRepository.remove).not.toHaveBeenCalled();
    });
  });
});