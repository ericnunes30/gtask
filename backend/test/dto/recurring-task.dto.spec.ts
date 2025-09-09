import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateRecurringTaskDto } from '../../src/modules/recurring-task/dto/create-recurring-task.dto';
import { UpdateRecurringTaskDto } from '../../src/modules/recurring-task/dto/update-recurring-task.dto';
import { ScheduleType } from '../../src/modules/recurring-task/entities/recurring-task.entity';
import { PriorityLevel } from '../../src/modules/tasks/entities/enums';

describe('RecurringTask DTOs Validation', () => {
  describe('CreateRecurringTaskDto', () => {
    it('should validate successfully with valid data', async () => {
      const validDto = {
        name: 'Daily Standup Task',
        schedule_type: ScheduleType.INTERVAL,
        frequency_interval: '1d',
        frequency_cron: null,
        next_due_date: new Date().toISOString(),
        is_active: true,
        userId: 1,
        projectId: 1,
        templateData: {
          title: 'Daily Standup',
          description: 'Attend daily standup meeting',
          priority: PriorityLevel.Medium,
          assignee_ids: [1, 2],
          occupation_ids: [1],
          start_date: '+0d',
          due_date: '+1d',
        },
      };

      const createDto = plainToInstance(CreateRecurringTaskDto, validDto);
      const errors = await validate(createDto);

      expect(errors.length).toBe(0);
    });

    it('should fail validation if name is missing', async () => {
      const invalidDto = {
        // name is missing
        schedule_type: ScheduleType.INTERVAL,
        frequency_interval: '1d',
        userId: 1,
        projectId: 1,
        templateData: {
          title: 'Test Task',
          priority: PriorityLevel.Medium,
        },
      };

      const createDto = plainToInstance(CreateRecurringTaskDto, invalidDto);
      const errors = await validate(createDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });

    it('should fail validation if schedule_type is invalid', async () => {
      const invalidDto = {
        name: 'Test Task',
        schedule_type: 'invalid_type', // Invalid enum value
        userId: 1,
        projectId: 1,
        templateData: {
          title: 'Test Task',
          priority: PriorityLevel.Medium,
        },
      };

      const createDto = plainToInstance(CreateRecurringTaskDto, invalidDto);
      const errors = await validate(createDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'schedule_type')).toBe(true);
    });

    it('should fail validation if userId is missing', async () => {
      const invalidDto = {
        name: 'Test Task',
        schedule_type: ScheduleType.INTERVAL,
        // userId is missing
        projectId: 1,
        templateData: {
          title: 'Test Task',
          priority: PriorityLevel.Medium,
        },
      };

      const createDto = plainToInstance(CreateRecurringTaskDto, invalidDto);
      const errors = await validate(createDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'userId')).toBe(true);
    });

    it('should fail validation if projectId is missing', async () => {
      const invalidDto = {
        name: 'Test Task',
        schedule_type: ScheduleType.INTERVAL,
        userId: 1,
        // projectId is missing
        templateData: {
          title: 'Test Task',
          priority: PriorityLevel.Medium,
        },
      };

      const createDto = plainToInstance(CreateRecurringTaskDto, invalidDto);
      const errors = await validate(createDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'projectId')).toBe(true);
    });

    it('should fail validation if templateData is missing', async () => {
      const invalidDto = {
        name: 'Test Task',
        schedule_type: ScheduleType.INTERVAL,
        userId: 1,
        projectId: 1,
        // templateData is missing
      };

      const createDto = plainToInstance(CreateRecurringTaskDto, invalidDto);
      const errors = await validate(createDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'templateData')).toBe(true);
    });

    it('should fail validation if templateData.title is missing', async () => {
      const invalidDto = {
        name: 'Test Task',
        schedule_type: ScheduleType.INTERVAL,
        userId: 1,
        projectId: 1,
        templateData: {
          // title is missing
          priority: PriorityLevel.Medium,
        },
      };

      const createDto = plainToInstance(CreateRecurringTaskDto, invalidDto);
      const errors = await validate(createDto);

      expect(errors.length).toBeGreaterThan(0);
      // Check for nested validation error
      expect(errors.some(e => 
        e.property === 'templateData' && 
        e.children && 
        e.children.some(child => child.property === 'title')
      )).toBe(true);
    });

    it('should fail validation if templateData.priority is invalid', async () => {
      const invalidDto = {
        name: 'Test Task',
        schedule_type: ScheduleType.INTERVAL,
        userId: 1,
        projectId: 1,
        templateData: {
          title: 'Test Task',
          priority: 'invalid_priority', // Invalid enum value
        },
      };

      const createDto = plainToInstance(CreateRecurringTaskDto, invalidDto);
      const errors = await validate(createDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => 
        e.property === 'templateData' && 
        e.children && 
        e.children.some(child => child.property === 'priority')
      )).toBe(true);
    });

    it('should validate successfully with CRON schedule type', async () => {
      const validDto = {
        name: 'Weekly Report',
        schedule_type: ScheduleType.CRON,
        frequency_cron: '0 9 * * MON',
        userId: 1,
        projectId: 1,
        templateData: {
          title: 'Weekly Report Task',
          priority: PriorityLevel.High,
        },
      };

      const createDto = plainToInstance(CreateRecurringTaskDto, validDto);
      const errors = await validate(createDto);

      expect(errors.length).toBe(0);
    });

    it('should validate successfully with assignee_ids and occupation_ids arrays', async () => {
      const validDto = {
        name: 'Team Task',
        schedule_type: ScheduleType.INTERVAL,
        frequency_interval: '2d',
        userId: 1,
        projectId: 1,
        templateData: {
          title: 'Team Task',
          priority: PriorityLevel.Medium,
          assignee_ids: [1, 2, 3],
          occupation_ids: [1, 2],
        },
      };

      const createDto = plainToInstance(CreateRecurringTaskDto, validDto);
      const errors = await validate(createDto);

      expect(errors.length).toBe(0);
    });
  });

  describe('UpdateRecurringTaskDto', () => {
    it('should validate successfully with partial valid data', async () => {
      const validUpdateDto = {
        name: 'Updated Task Name',
        is_active: false,
      };

      const updateDto = plainToInstance(UpdateRecurringTaskDto, validUpdateDto);
      const errors = await validate(updateDto);

      expect(errors.length).toBe(0);
    });

    it('should allow all fields to be optional', async () => {
      const emptyUpdateDto = {}; // Empty object

      const updateDto = plainToInstance(UpdateRecurringTaskDto, emptyUpdateDto);
      const errors = await validate(updateDto);

      expect(errors.length).toBe(0); // No fields are required
    });

    it('should validate successfully when updating templateData partially', async () => {
      const validUpdateDto = {
        templateData: {
          title: 'Updated Template Title',
          priority: PriorityLevel.High,
        },
      };

      const updateDto = plainToInstance(UpdateRecurringTaskDto, validUpdateDto);
      const errors = await validate(updateDto);

      expect(errors.length).toBe(0);
    });

    it('should fail validation if schedule_type is invalid', async () => {
      const invalidUpdateDto = {
        schedule_type: 'invalid_schedule', // Invalid enum value
      };

      const updateDto = plainToInstance(UpdateRecurringTaskDto, invalidUpdateDto);
      const errors = await validate(updateDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'schedule_type')).toBe(true);
    });

    it('should fail validation if templateData.priority is invalid', async () => {
      const invalidUpdateDto = {
        templateData: {
          priority: 'super_high', // Invalid enum value
        },
      };

      const updateDto = plainToInstance(UpdateRecurringTaskDto, invalidUpdateDto);
      const errors = await validate(updateDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => 
        e.property === 'templateData' && 
        e.children && 
        e.children.some(child => child.property === 'priority')
      )).toBe(true);
    });

    it('should validate successfully when updating next_due_date', async () => {
      const validUpdateDto = {
        next_due_date: new Date('2024-12-25').toISOString(),
      };

      const updateDto = plainToInstance(UpdateRecurringTaskDto, validUpdateDto);
      const errors = await validate(updateDto);

      expect(errors.length).toBe(0);
    });
  });
});