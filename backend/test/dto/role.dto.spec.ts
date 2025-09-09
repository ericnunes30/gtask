import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateRoleDto } from '../../src/modules/role/dto/create-role.dto';
import { UpdateRoleDto } from '../../src/modules/role/dto/update-role.dto';

describe('Role DTOs Validation', () => {
  describe('CreateRoleDto', () => {
    it('should validate successfully with valid data', async () => {
      const validRoleDto = {
        name: 'Admin',
        description: 'Administrator role',
      };

      const createRoleDto = plainToInstance(CreateRoleDto, validRoleDto);
      const errors = await validate(createRoleDto);

      expect(errors.length).toBe(0);
    });

    it('should fail validation if name is missing', async () => {
      const invalidRoleDto = {
        // name is missing
        description: 'Role description',
      };

      const createRoleDto = plainToInstance(CreateRoleDto, invalidRoleDto);
      const errors = await validate(createRoleDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation if name exceeds max length', async () => {
      const longName = 'a'.repeat(256); // Exceeds MaxLength(255)
      const invalidRoleDto = {
        name: longName,
        description: 'Role description',
      };

      const createRoleDto = plainToInstance(CreateRoleDto, invalidRoleDto);
      const errors = await validate(createRoleDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should allow optional description to be missing', async () => {
      const roleDtoWithoutDescription = {
        name: 'User',
      };

      const createRoleDto = plainToInstance(CreateRoleDto, roleDtoWithoutDescription);
      const errors = await validate(createRoleDto);

      expect(errors.length).toBe(0);
    });
  });

  describe('UpdateRoleDto', () => {
    it('should validate successfully with partial valid data', async () => {
      const validUpdateDto = {
        description: 'Updated description for role',
      };

      const updateRoleDto = plainToInstance(UpdateRoleDto, validUpdateDto);
      const errors = await validate(updateRoleDto);

      expect(errors.length).toBe(0);
    });

    it('should allow all fields to be optional', async () => {
      const emptyUpdateDto = {}; // Empty object

      const updateRoleDto = plainToInstance(UpdateRoleDto, emptyUpdateDto);
      const errors = await validate(updateRoleDto);

      expect(errors.length).toBe(0); // No fields are required in PartialType
    });
  });
});