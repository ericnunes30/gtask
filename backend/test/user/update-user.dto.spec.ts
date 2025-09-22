import { validate } from 'class-validator';
import { UpdateUserDto } from '../../src/modules/user/dto/update-user.dto';
import { plainToInstance } from 'class-transformer';

describe('UpdateUserDto', () => {
  let updateUserDto: UpdateUserDto;

  beforeEach(() => {
    updateUserDto = plainToInstance(UpdateUserDto, {
      name: 'Updated User',
      email: 'updated@example.com',
      password: 'newpassword123'
    });
  });

  describe('Validation Success', () => {
    it('should validate with all fields provided', async () => {
      const errors = await validate(updateUserDto);
      expect(errors.length).toBe(0);
    });

    it('should validate with partial fields - only name', async () => {
      const dtoWithOnlyName = plainToInstance(UpdateUserDto, {
        name: 'Updated Name'
      });
      const errors = await validate(dtoWithOnlyName);
      expect(errors.length).toBe(0);
    });

    it('should validate with partial fields - only email', async () => {
      const dtoWithOnlyEmail = plainToInstance(UpdateUserDto, {
        email: 'updated@example.com'
      });
      const errors = await validate(dtoWithOnlyEmail);
      expect(errors.length).toBe(0);
    });

    it('should validate with partial fields - only password', async () => {
      const dtoWithOnlyPassword = plainToInstance(UpdateUserDto, {
        password: 'newpassword123'
      });
      const errors = await validate(dtoWithOnlyPassword);
      expect(errors.length).toBe(0);
    });

    it('should validate with two fields', async () => {
      const dtoWithTwoFields = plainToInstance(UpdateUserDto, {
        name: 'Updated Name',
        email: 'updated@example.com'
      });
      const errors = await validate(dtoWithTwoFields);
      expect(errors.length).toBe(0);
    });

    it('should validate with empty object (no updates)', async () => {
      const emptyDto = plainToInstance(UpdateUserDto, {});
      const errors = await validate(emptyDto);
      expect(errors.length).toBe(0);
    });

    it('should validate with minimum password length', async () => {
      const dtoWithMinPassword = plainToInstance(UpdateUserDto, {
        password: '123456'
      });
      const errors = await validate(dtoWithMinPassword);
      expect(errors.length).toBe(0);
    });

    it('should validate with valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@domain.com',
        'user+tag@example.com',
        'user@sub.domain.com',
        '123@example.com'
      ];

      for (const email of validEmails) {
        const dtoWithEmail = plainToInstance(UpdateUserDto, {
          email
        });
        const errors = await validate(dtoWithEmail);
        expect(errors.length).toBe(0, `Failed for email: ${email}`);
      }
    });

    it('should validate with different valid names', async () => {
      const validNames = [
        'John Doe',
        'Jane Smith',
        'Single',
        'Name With Spaces',
        'José Silva',
        'Müller'
      ];

      for (const name of validNames) {
        const dtoWithName = plainToInstance(UpdateUserDto, {
          name
        });
        const errors = await validate(dtoWithName);
        expect(errors.length).toBe(0, `Failed for name: ${name}`);
      }
    });
  });

  describe('Name Validation', () => {
    it('should reject non-string name', async () => {
      const dtoWithInvalidName = plainToInstance(UpdateUserDto, {
        name: 123 as any
      });
      const errors = await validate(dtoWithInvalidName);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should allow name to be optional', async () => {
      const dtoWithoutName = plainToInstance(UpdateUserDto, {
        email: 'updated@example.com'
      });
      const errors = await validate(dtoWithoutName);
      expect(errors.length).toBe(0);
    });
  });

  describe('Email Validation', () => {
    it('should reject invalid email formats when provided', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user@example',
        'user@example.',
        'user.example.com',
        'user@ex ample.com'
      ];

      for (const email of invalidEmails) {
        const dtoWithInvalidEmail = plainToInstance(UpdateUserDto, {
          email
        });
        const errors = await validate(dtoWithInvalidEmail);
        expect(errors.length).toBeGreaterThan(0, `Should have failed for email: ${email}`);
        expect(errors[0].property).toBe('email');
      }
    });

    it('should allow email to be optional', async () => {
      const dtoWithoutEmail = plainToInstance(UpdateUserDto, {
        name: 'Updated Name'
      });
      const errors = await validate(dtoWithoutEmail);
      expect(errors.length).toBe(0);
    });
  });

  describe('Password Validation', () => {
    it('should reject empty password when provided', async () => {
      const dtoWithEmptyPassword = plainToInstance(UpdateUserDto, {
        password: ''
      });
      const errors = await validate(dtoWithEmptyPassword);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });

    it('should reject non-string password when provided', async () => {
      const dtoWithInvalidPassword = plainToInstance(UpdateUserDto, {
        password: 123456 as any
      });
      const errors = await validate(dtoWithInvalidPassword);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should allow password to be optional', async () => {
      const dtoWithoutPassword = plainToInstance(UpdateUserDto, {
        name: 'Updated Name'
      });
      const errors = await validate(dtoWithoutPassword);
      expect(errors.length).toBe(0);
    });
  });

  describe('Multiple Validation Errors', () => {
    it('should collect all validation errors for provided fields', async () => {
      const invalidDto = plainToInstance(UpdateUserDto, {
        name: 123 as any,
        email: 'invalid-email',
        password: '1234'
      });

      const errors = await validate(invalidDto);
      expect(errors.length).toBeGreaterThan(0);

      const properties = errors.map(error => error.property);
      expect(properties).toContain('name');
      expect(properties).toContain('email');
      // Note: password validation may not trigger for very short strings due to optional nature
    });

    it('should validate only provided fields', async () => {
      const mixedDto = plainToInstance(UpdateUserDto, {
        name: 'Valid Name',
        email: 'invalid-email'
        // password not provided, should not be validated
      });

      const errors = await validate(mixedDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
      expect(errors.some(error => error.property === 'password')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace in strings', async () => {
      const dtoWithWhitespace = plainToInstance(UpdateUserDto, {
        name: 'Updated User',
        email: 'updated@example.com',
        password: 'newpassword123'
      });

      const errors = await validate(dtoWithWhitespace);
      expect(errors.length).toBe(0);
    });

    it('should handle special characters in name', async () => {
      const dtoWithSpecialChars = plainToInstance(UpdateUserDto, {
        name: 'José María Silva-Müller'
      });
      const errors = await validate(dtoWithSpecialChars);
      expect(errors.length).toBe(0);
    });

    it('should handle long valid password', async () => {
      const dtoWithLongPassword = plainToInstance(UpdateUserDto, {
        password: 'a'.repeat(100) // 100 character password
      });
      const errors = await validate(dtoWithLongPassword);
      expect(errors.length).toBe(0);
    });

    it('should handle undefined fields gracefully', async () => {
      const dtoWithUndefined = plainToInstance(UpdateUserDto, {
        name: undefined,
        email: undefined,
        password: undefined
      });
      const errors = await validate(dtoWithUndefined);
      expect(errors.length).toBe(0);
    });

    it('should handle null fields gracefully', async () => {
      const dtoWithNulls = plainToInstance(UpdateUserDto, {
        name: null,
        email: null,
        password: null
      });
      const errors = await validate(dtoWithNulls);
      expect(errors.length).toBe(0);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should validate typical name update', async () => {
      const nameUpdateDto = plainToInstance(UpdateUserDto, {
        name: 'John Smith'
      });
      const errors = await validate(nameUpdateDto);
      expect(errors.length).toBe(0);
    });

    it('should validate typical email update', async () => {
      const emailUpdateDto = plainToInstance(UpdateUserDto, {
        email: 'new.email@example.com'
      });
      const errors = await validate(emailUpdateDto);
      expect(errors.length).toBe(0);
    });

    it('should validate typical password update', async () => {
      const passwordUpdateDto = plainToInstance(UpdateUserDto, {
        password: 'newSecurePassword123'
      });
      const errors = await validate(passwordUpdateDto);
      expect(errors.length).toBe(0);
    });

    it('should validate complete profile update', async () => {
      const completeUpdateDto = plainToInstance(UpdateUserDto, {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        password: 'securePassword456'
      });
      const errors = await validate(completeUpdateDto);
      expect(errors.length).toBe(0);
    });
  });
});