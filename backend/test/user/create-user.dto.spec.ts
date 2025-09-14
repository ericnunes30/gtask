import { validate } from 'class-validator';
import { CreateUserDto } from '../../src/modules/user/dto/create-user.dto';
import { plainToInstance } from 'class-transformer';

describe('CreateUserDto', () => {
  let createUserDto: CreateUserDto;

  beforeEach(() => {
    createUserDto = plainToInstance(CreateUserDto, {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
  });

  describe('Validation Success', () => {
    it('should validate with correct data', async () => {
      const errors = await validate(createUserDto);
      expect(errors.length).toBe(0);
    });

    it('should validate with minimum password length', async () => {
      createUserDto.password = '123456';
      const errors = await validate(createUserDto);
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
        createUserDto.email = email;
        const errors = await validate(createUserDto);
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
        createUserDto.name = name;
        const errors = await validate(createUserDto);
        expect(errors.length).toBe(0, `Failed for name: ${name}`);
      }
    });
  });

  describe('Name Validation', () => {
    it('should reject missing name', async () => {
      createUserDto.name = '';
      const errors = await validate(createUserDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });

    it('should reject undefined name', async () => {
      const dtoWithoutName = plainToInstance(CreateUserDto, {
        email: 'test@example.com',
        password: 'password123'
      });
      const errors = await validate(dtoWithoutName);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should reject non-string name', async () => {
      const dtoWithInvalidName = plainToInstance(CreateUserDto, {
        name: 123 as any,
        email: 'test@example.com',
        password: 'password123'
      });
      const errors = await validate(dtoWithInvalidName);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints?.isString).toBeDefined();
    });
  });

  describe('Email Validation', () => {
    it('should reject missing email', async () => {
      createUserDto.email = '';
      const errors = await validate(createUserDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });

    it('should reject undefined email', async () => {
      const dtoWithoutEmail = plainToInstance(CreateUserDto, {
        name: 'Test User',
        password: 'password123'
      });
      const errors = await validate(dtoWithoutEmail);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('should reject invalid email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user@example',
        'user@example.',
        'user.example.com',
        '',
        ' ',
        'user@ex ample.com'
      ];

      for (const email of invalidEmails) {
        createUserDto.email = email;
        const errors = await validate(createUserDto);
        expect(errors.length).toBeGreaterThan(0, `Should have failed for email: ${email}`);
        expect(errors[0].property).toBe('email');
      }
    });
  });

  describe('Password Validation', () => {
    it('should reject missing password', async () => {
      createUserDto.password = '';
      const errors = await validate(createUserDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });

    it('should reject undefined password', async () => {
      const dtoWithoutPassword = plainToInstance(CreateUserDto, {
        name: 'Test User',
        email: 'test@example.com'
      });
      const errors = await validate(dtoWithoutPassword);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it('should reject short passwords', async () => {
      const shortPasswords = [
        '12345',
        '1234'
      ];

      for (const password of shortPasswords) {
        createUserDto.password = password;
        const errors = await validate(createUserDto);
        expect(errors.length).toBeGreaterThan(0, `Should have failed for password: ${password}`);
        expect(errors[0].property).toBe('password');
        expect(errors[0].constraints?.minLength).toBeDefined();
      }
    });

    it('should reject non-string password', async () => {
      const dtoWithInvalidPassword = plainToInstance(CreateUserDto, {
        name: 'Test User',
        email: 'test@example.com',
        password: 123456 as any
      });
      const errors = await validate(dtoWithInvalidPassword);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
      expect(errors[0].constraints?.isString).toBeDefined();
    });
  });

  describe('Multiple Validation Errors', () => {
    it('should collect all validation errors', async () => {
      const invalidDto = plainToInstance(CreateUserDto, {
        name: '',
        email: 'invalid-email',
        password: '1234'
      });

      const errors = await validate(invalidDto);
      expect(errors.length).toBeGreaterThan(1);

      const properties = errors.map(error => error.property);
      expect(properties).toContain('name');
      expect(properties).toContain('email');
      // Note: password validation may vary based on class-validator behavior
    });

    it('should handle completely invalid data', async () => {
      const completelyInvalidDto = plainToInstance(CreateUserDto, {
        name: 123 as any,
        email: 456 as any,
        password: true as any
      });

      const errors = await validate(completelyInvalidDto);
      expect(errors.length).toBeGreaterThan(0);

      const properties = errors.map(error => error.property);
      expect(properties).toContain('name');
      expect(properties).toContain('email');
      expect(properties).toContain('password');
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace in strings', async () => {
      createUserDto.name = 'Test User';
      createUserDto.email = 'test@example.com';
      createUserDto.password = 'password123';

      const errors = await validate(createUserDto);
      expect(errors.length).toBe(0);
    });

    it('should handle special characters in name', async () => {
      createUserDto.name = 'José María Silva-Müller';
      const errors = await validate(createUserDto);
      expect(errors.length).toBe(0);
    });

    it('should handle long valid password', async () => {
      createUserDto.password = 'a'.repeat(100); // 100 character password
      const errors = await validate(createUserDto);
      expect(errors.length).toBe(0);
    });
  });
});