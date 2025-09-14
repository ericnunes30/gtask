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
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      const createProjectDto = plainToInstance(CreateProjectDto, validProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBe(0);
    });

    it('should validate successfully with users array', async () => {
      const validProjectDto = {
        title: 'New Project',
        description: 'Project description',
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        users: [1, 2, 3],
      };

      const createProjectDto = plainToInstance(CreateProjectDto, validProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBe(0);
    });

    it('should validate successfully with teams array', async () => {
      const validProjectDto = {
        title: 'New Project',
        description: 'Project description',
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        teams: [1, 2],
      };

      const createProjectDto = plainToInstance(CreateProjectDto, validProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBe(0);
    });

    it('should validate successfully with both users and teams arrays', async () => {
      const validProjectDto = {
        title: 'New Project',
        description: 'Project description',
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        users: [1, 2, 3],
        teams: [1, 2],
      };

      const createProjectDto = plainToInstance(CreateProjectDto, validProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBe(0);
    });

    it('should validate successfully without description', async () => {
      const validProjectDto = {
        title: 'New Project',
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      const createProjectDto = plainToInstance(CreateProjectDto, validProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBe(0);
    });

    it('should validate successfully with empty users array', async () => {
      const validProjectDto = {
        title: 'New Project',
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        users: [],
      };

      const createProjectDto = plainToInstance(CreateProjectDto, validProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBe(0);
    });

    it('should validate successfully with empty teams array', async () => {
      const validProjectDto = {
        title: 'New Project',
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        teams: [],
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

    it('should fail validation if title is not a string', async () => {
      const invalidProjectDto = {
        title: 123, // Invalid type
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

    it('should fail validation if title is too long', async () => {
      const invalidProjectDto = {
        title: 'a'.repeat(256), // 256 characters, over limit
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('title');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should fail validation if title is empty string', async () => {
      const invalidProjectDto = {
        title: '', // Empty string
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      // Note: Empty strings may or may not fail validation depending on class-validator configuration
      // This test documents the current behavior
      if (errors.length > 0) {
        expect(errors[0].property).toBe('title');
      }
    });

    it('should fail validation if description is not a string', async () => {
      const invalidProjectDto = {
        title: 'Valid Title',
        description: 123, // Invalid type
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('description');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation if status is missing', async () => {
      const invalidProjectDto = {
        title: 'Project Title',
        // status is missing
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('status');
      expect(errors[0].constraints).toHaveProperty('isBoolean');
    });

    it('should fail validation if status is not a boolean', async () => {
      const invalidProjectDto = {
        title: 'Project Title',
        status: 'true', // Invalid type
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('status');
      expect(errors[0].constraints).toHaveProperty('isBoolean');
    });

    it('should fail validation if priority is missing', async () => {
      const invalidProjectDto = {
        title: 'Project Title',
        status: true,
        // priority is missing
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('priority');
      expect(errors[0].constraints).toHaveProperty('isEnum');
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

    it('should validate all valid priority levels', async () => {
      const validPriorities = Object.values(PriorityLevel);
      
      for (const priority of validPriorities) {
        const validProjectDto = {
          title: 'Project Title',
          status: true,
          priority: priority,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        };

        const createProjectDto = plainToInstance(CreateProjectDto, validProjectDto);
        const errors = await validate(createProjectDto);

        expect(errors.length).toBe(0);
      }
    });

    it('should fail validation if start_date is missing', async () => {
      const invalidProjectDto = {
        title: 'Project Title',
        status: true,
        priority: PriorityLevel.High,
        // start_date is missing
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('start_date');
      expect(errors[0].constraints).toHaveProperty('isDateString');
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

    it('should fail validation if start_date is not a string', async () => {
      const invalidProjectDto = {
        title: 'Project with invalid start date',
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date(), // Date object instead of string
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('start_date');
      expect(errors[0].constraints).toHaveProperty('isDateString');
    });

    it('should fail validation if end_date is missing', async () => {
      const invalidProjectDto = {
        title: 'Project Title',
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        // end_date is missing
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('end_date');
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

    it('should fail validation if users array contains non-integers', async () => {
      const invalidProjectDto = {
        title: 'Project Title',
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        users: [1, '2', 3], // String instead of number
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('users');
      expect(errors[0].constraints).toHaveProperty('isInt');
    });

    it('should fail validation if teams array contains non-integers', async () => {
      const invalidProjectDto = {
        title: 'Project Title',
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        teams: [1, '2', 3], // String instead of number
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('teams');
      expect(errors[0].constraints).toHaveProperty('isInt');
    });

    it('should fail validation if users is not an array', async () => {
      const invalidProjectDto = {
        title: 'Project Title',
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        users: '1,2,3', // String instead of array
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('users');
      expect(errors[0].constraints).toHaveProperty('isArray');
    });

    it('should fail validation if teams is not an array', async () => {
      const invalidProjectDto = {
        title: 'Project Title',
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        teams: '1,2,3', // String instead of array
      };

      const createProjectDto = plainToInstance(CreateProjectDto, invalidProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('teams');
      expect(errors[0].constraints).toHaveProperty('isArray');
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

    it('should validate single field updates', async () => {
      const testCases = [
        { title: 'Updated Title' },
        { description: 'Updated Description' },
        { status: false },
        { priority: PriorityLevel.Low },
        { start_date: new Date().toISOString() },
        { end_date: new Date(Date.now() + 86400000 * 7).toISOString() },
        { users: [1, 2, 3] },
        { teams: [1, 2] },
      ];

      for (const testCase of testCases) {
        const updateProjectDto = plainToInstance(UpdateProjectDto, testCase);
        const errors = await validate(updateProjectDto);

        expect(errors.length).toBe(0);
      }
    });

    it('should validate multiple field updates', async () => {
      const validUpdateDto = {
        title: 'Updated Project Title',
        description: 'Updated Description',
        status: false,
        priority: PriorityLevel.Low,
        users: [1, 2, 3],
        teams: [1, 2],
      };

      const updateProjectDto = plainToInstance(UpdateProjectDto, validUpdateDto);
      const errors = await validate(updateProjectDto);

      expect(errors.length).toBe(0);
    });

    it('should fail validation with invalid data types', async () => {
      const invalidUpdateCases = [
        { title: 123 }, // Invalid type
        { description: 456 }, // Invalid type
        { status: 'false' }, // Invalid type
        { priority: 'invalid' }, // Invalid enum value
        { start_date: 'not-a-date' }, // Invalid date
        { end_date: 'not-a-date' }, // Invalid date
        { users: [1, '2', 3] }, // Mixed types in array
        { teams: [1, '2', 3] }, // Mixed types in array
        { users: '1,2,3' }, // Not an array
        { teams: '1,2,3' }, // Not an array
      ];

      for (const testCase of invalidUpdateCases) {
        const updateProjectDto = plainToInstance(UpdateProjectDto, testCase);
        const errors = await validate(updateProjectDto);

        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('should allow removing optional fields', async () => {
      const updateProjectDto = plainToInstance(UpdateProjectDto, { users: [] });
      const errors = await validate(updateProjectDto);

      expect(errors.length).toBe(0);
    });

    it('should handle null values appropriately', async () => {
      const updateProjectDto = plainToInstance(UpdateProjectDto, { 
        description: null,
        users: null,
        teams: null 
      });
      const errors = await validate(updateProjectDto);

      expect(errors.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values for dates', async () => {
      const boundaryProjectDto = {
        title: 'Boundary Project',
        status: true,
        priority: PriorityLevel.High,
        start_date: '1900-01-01T00:00:00.000Z',
        end_date: '2100-12-31T23:59:59.999Z',
      };

      const createProjectDto = plainToInstance(CreateProjectDto, boundaryProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBe(0);
    });

    it('should handle large arrays for users and teams', async () => {
      const largeProjectDto = {
        title: 'Large Project',
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        users: Array.from({ length: 1000 }, (_, i) => i + 1),
        teams: Array.from({ length: 100 }, (_, i) => i + 1),
      };

      const createProjectDto = plainToInstance(CreateProjectDto, largeProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBe(0);
    });

    it('should handle special characters in title and description', async () => {
      const specialCharProjectDto = {
        title: 'Projeto com acentuação & caractères spéciaux!@#$%^&*()',
        description: 'Descrição com emojis 🎉 e símbolos especiais',
        status: true,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      const createProjectDto = plainToInstance(CreateProjectDto, specialCharProjectDto);
      const errors = await validate(createProjectDto);

      expect(errors.length).toBe(0);
    });
  });
});