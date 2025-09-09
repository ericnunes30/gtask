import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTaskDto } from '../../src/modules/tasks/dto/create-task.dto';
import { UpdateTaskDto } from '../../src/modules/tasks/dto/update-task.dto';
import { PriorityLevel, Status } from '../../src/modules/tasks/entities/enums';

describe('Task DTOs Validation', () => {
  describe('CreateTaskDto', () => {
    it('should validate successfully with valid data', async () => {
      const validTaskDto = {
        title: 'Valid Task Title',
        description: 'A valid description',
        priority: PriorityLevel.High,
        status: Status.InProgress,
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(), // Due date tomorrow
        project_id: 1,
        task_reviewer_id: 2,
        useful_links: [{ title: 'Link Title', url: 'http://example.com' }],
        observations: 'Some observations',
      };

      const createTaskDto = plainToInstance(CreateTaskDto, validTaskDto);
      const errors = await validate(createTaskDto);

      expect(errors.length).toBe(0);
    });

    it('should fail validation if title is missing', async () => {
      const invalidTaskDto = {
        // title is missing
        priority: PriorityLevel.High,
        status: Status.InProgress,
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
        project_id: 1,
      };

      const createTaskDto = plainToInstance(CreateTaskDto, invalidTaskDto);
      const errors = await validate(createTaskDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('title');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation if priority is invalid', async () => {
      const invalidTaskDto = {
        title: 'Task with invalid priority',
        priority: 'not_a_priority', // Invalid priority value
        status: Status.InProgress,
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
        project_id: 1,
      };

      const createTaskDto = plainToInstance(CreateTaskDto, invalidTaskDto);
      const errors = await validate(createTaskDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('priority');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should fail validation if due_date is not a date string', async () => {
      const invalidTaskDto = {
        title: 'Task with invalid due date',
        priority: PriorityLevel.High,
        status: Status.InProgress,
        start_date: new Date().toISOString(),
        due_date: 'not-a-date', // Invalid date string
        project_id: 1,
      };

      const createTaskDto = plainToInstance(CreateTaskDto, invalidTaskDto);
      const errors = await validate(createTaskDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('due_date');
      expect(errors[0].constraints).toHaveProperty('isDateString');
    });

    it('should fail validation if project_id is missing', async () => {
        const invalidTaskDto = {
            title: 'Task missing project ID',
            priority: PriorityLevel.High,
            status: Status.InProgress,
            start_date: new Date().toISOString(),
            due_date: new Date(Date.now() + 86400000).toISOString(),
            // project_id is missing
        };

        const createTaskDto = plainToInstance(CreateTaskDto, invalidTaskDto);
        const errors = await validate(createTaskDto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('project_id');
        expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('should fail validation if useful_links format is incorrect', async () => {
        const invalidTaskDto = {
            title: 'Task with bad link',
            priority: PriorityLevel.High,
            status: Status.InProgress,
            start_date: new Date().toISOString(),
            due_date: new Date(Date.now() + 86400000).toISOString(),
            project_id: 1,
            useful_links: [{ title: 'Good Link', url: 'http://example.com' }, { title: 'Bad Link' }], // Missing URL
        };

        const createTaskDto = plainToInstance(CreateTaskDto, invalidTaskDto);
        const errors = await validate(createTaskDto);

        expect(errors.length).toBeGreaterThan(0);
        // Depending on how validation errors are aggregated, we might check for specific properties
        expect(errors.some(e => e.property === 'useful_links')).toBe(true);
        // Further checks on the nested object's errors might be needed if the structure is complex
    });
  });

  describe('UpdateTaskDto', () => {
    it('should validate successfully with partial valid data', async () => {
      const validUpdateDto = {
        title: 'Updated Task Title',
        status: Status.Done,
      };

      const updateTaskDto = plainToInstance(UpdateTaskDto, validUpdateDto);
      const errors = await validate(updateTaskDto);

      expect(errors.length).toBe(0);
    });

    it('should allow all fields to be optional', async () => {
      const emptyUpdateDto = {}; // Empty object

      const updateTaskDto = plainToInstance(UpdateTaskDto, emptyUpdateDto);
      const errors = await validate(updateTaskDto);

      expect(errors.length).toBe(0); // No fields are required in PartialType
    });

    it('should fail validation if status is invalid', async () => {
      const invalidUpdateDto = {
        status: 'completed', // Invalid status
      };

      const updateTaskDto = plainToInstance(UpdateTaskDto, invalidUpdateDto);
      const errors = await validate(updateTaskDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('status');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });
  });
});