import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateProjectDto } from '../../src/modules/project/dto/create-project.dto';
import { UpdateProjectDto } from '../../src/modules/project/dto/update-project.dto';
import { PriorityLevel } from '../../src/modules/tasks/entities/enums';

describe('Project DTOs Validation', () => {
  describe('CreateProjectDto', () => {
    it('should validate successfully with valid data', async () => {
      const validProjectDto = {
        title: 'New Project',
        description: 'Project description',
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(), // End date a week from now
      };

      const createProjectDto = plainToInstance(CreateProjectDto, validProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBe(0);
    });

    it('should fail validation if title is missing', async () => {
      const invalidProjectDto = {
        // title is missing
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('title');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation if priority is invalid', async () => {
      const invalidProjectDto = {
        title: 'Project with invalid priority',
        status: true,
        priority: 'urgentt', // Invalid priority value
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('priority');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should fail validation if start_date is not a date string', async () => {
      const invalidProjectDto = {
        title: 'Project with invalid start date',
        status: true,
        priority: PriorityLevel.High,
        start_date: 'not-a-date', // Invalid date string
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('start_date');
      expect(errors[0].constraints).toHaveProperty('isDateString');
    });

    it('should fail validation if end_date is not a date string', async () => {
      const invalidProjectDto = {
        title: 'Project with invalid end date',
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: 'not-a-date-either', // Invalid date string
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('end_date');
      expect(errors[0].constraints).toHaveProperty('isDateString');
    });
  });

  describe('UpdateProjectDto', () => {
    it('should validate successfully with partial valid data', async () => {
      const validUpdateDto = {
        title: 'Updated Project Title',
        status: false,
      };

      const updateProjectDto = plainToInstance(UpdateProjectDto, validUpdateDto);
      const errors = await validate(updateProjectDto);

      expect(errors.length).toBe(0);
    });

    it('should allow all fields to be optional', async () => {
      const emptyUpdateDto = {}; // Empty object

      const updateProjectDto = plainToInstance(UpdateProjectDto, emptyUpdateDto);
      const errors = await validate(updateProjectDto);

      expect(errors.length).toBe(0); // No fields are required in PartialType
    });
  });
});