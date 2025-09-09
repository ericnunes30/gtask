import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateOccupationDto } from '../../src/modules/occupation/dto/create-occupation.dto';
import { UpdateOccupationDto } from '../../src/modules/occupation/dto/update-occupation.dto';

describe('Occupation DTOs Validation', () => {
  describe('CreateOccupationDto', () => {
    it('should validate successfully with valid data', async () => {
      const validOccupationDto = {
        name: 'Software Engineer',
      };

      const createOccupationDto = plainToInstance(CreateOccupationDto, validOccupationDto);
      const errors = await validate(createOccupationDto);

      expect(errors.length).toBe(0);
    });

    it('should fail validation if name is missing', async () => {
      const invalidOccupationDto = {
        // name is missing
      };

      const createOccupationDto = plainToInstance(CreateOccupationDto, invalidOccupationDto);
      const errors = await validate(createOccupationDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation if name exceeds max length', async () => {
      const longName = 'a'.repeat(256); // Exceeds MaxLength(255)
      const invalidOccupationDto = {
        name: longName,
      };

      const createOccupationDto = plainToInstance(CreateOccupationDto, invalidOccupationDto);
      const errors = await validate(createOccupationDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });
  });

  describe('UpdateOccupationDto', () => {
    it('should validate successfully with partial valid data', async () => {
      const validUpdateDto = {
        name: 'Senior Software Engineer',
      };

      const updateOccupationDto = plainToInstance(UpdateOccupationDto, validUpdateDto);
      const errors = await validate(updateOccupationDto);

      expect(errors.length).toBe(0);
    });

    it('should allow all fields to be optional', async () => {
      const emptyUpdateDto = {}; // Empty object

      const updateOccupationDto = plainToInstance(UpdateOccupationDto, emptyUpdateDto);
      const errors = await validate(updateOccupationDto);

      expect(errors.length).toBe(0); // No fields are required in PartialType
    });
  });
});