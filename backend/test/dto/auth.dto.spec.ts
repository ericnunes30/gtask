import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from '../../src/modules/auth/dto/login.dto';
import { RegisterDto } from '../../src/modules/auth/dto/register.dto';
import { CreateUserDto } from '../../src/modules/user/dto/create-user.dto';

describe('Auth DTOs Validation', () => {
  describe('LoginDto', () => {
    it('should validate successfully with valid data', async () => {
      const validLoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const loginDto = plainToInstance(LoginDto, validLoginDto);
      const errors = await validate(loginDto);

      expect(errors.length).toBe(0);
    });

    it('should fail validation if email is missing', async () => {
      const invalidLoginDto = {
        // email is missing
        password: 'password123',
      };

      const loginDto = plainToInstance(LoginDto, invalidLoginDto);
      const errors = await validate(loginDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints).toHaveProperty('isEmail');
    });

    it('should fail validation if email format is invalid', async () => {
      const invalidLoginDto = {
        email: 'invalid-email',
        password: 'password123',
      };

      const loginDto = plainToInstance(LoginDto, invalidLoginDto);
      const errors = await validate(loginDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints).toHaveProperty('isEmail');
    });

    it('should fail validation if password is missing', async () => {
      const invalidLoginDto = {
        email: 'test@example.com',
        // password is missing
      };

      const loginDto = plainToInstance(LoginDto, invalidLoginDto);
      const errors = await validate(loginDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
      expect(errors[0].constraints).toHaveProperty('minLength');
    });

    it('should fail validation if password is too short', async () => {
      const invalidLoginDto = {
        email: 'test@example.com',
        password: 'pass', // Less than 6 characters
      };

      const loginDto = plainToInstance(LoginDto, invalidLoginDto);
      const errors = await validate(loginDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
      expect(errors[0].constraints).toHaveProperty('minLength');
    });
  });

  describe('RegisterDto', () => {
    it('should validate successfully with valid data', async () => {
      const validRegisterDto = {
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'password12345',
      };

      const registerDto = plainToInstance(RegisterDto, validRegisterDto);
      const errors = await validate(registerDto);

      expect(errors.length).toBe(0);
    });

    it('should fail validation if name is missing', async () => {
      const invalidRegisterDto = {
        // name is missing
        email: 'testuser@example.com',
        password: 'password12345',
      };

      const registerDto = plainToInstance(RegisterDto, invalidRegisterDto);
      const errors = await validate(registerDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isString'); // Assuming isString is the primary constraint for name
    });

    it('should fail validation if email is missing', async () => {
      const invalidRegisterDto = {
        name: 'Test User',
        // email is missing
        password: 'password12345',
      };

      const registerDto = plainToInstance(RegisterDto, invalidRegisterDto);
      const errors = await validate(registerDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints).toHaveProperty('isEmail');
    });

    it('should fail validation if password is missing', async () => {
      const invalidRegisterDto = {
        name: 'Test User',
        email: 'testuser@example.com',
        // password is missing
      };

      const registerDto = plainToInstance(RegisterDto, invalidRegisterDto);
      const errors = await validate(registerDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
      expect(errors[0].constraints).toHaveProperty('minLength');
    });

    it('should fail validation if password is too short', async () => {
      const invalidRegisterDto = {
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'pass', // Less than 6 characters
      };

      const registerDto = plainToInstance(RegisterDto, invalidRegisterDto);
      const errors = await validate(registerDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
      expect(errors[0].constraints).toHaveProperty('minLength');
    });

    it('should fail validation if name exceeds max length', async () => {
      const longName = 'a'.repeat(256); // Exceeds MaxLength(255)
      const invalidRegisterDto = {
        name: longName,
        email: 'testuser@example.com',
        password: 'password12345',
      };

      const registerDto = plainToInstance(RegisterDto, invalidRegisterDto);
      const errors = await validate(registerDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });
  });

  // Test CreateUserDto using the same logic as RegisterDto since they are similar
  describe('CreateUserDto', () => {
    it('should validate successfully with valid data', async () => {
      const validCreateUserDto = {
        name: 'Test User For Create',
        email: 'createuser@example.com',
        password: 'password123456',
      };

      const createUserDto = plainToInstance(CreateUserDto, validCreateUserDto);
      const errors = await validate(createUserDto);

      expect(errors.length).toBe(0);
    });

    it('should fail validation if name is missing', async () => {
      const invalidCreateUserDto = {
        // name is missing
        email: 'createuser@example.com',
        password: 'password123456',
      };

      const createUserDto = plainToInstance(CreateUserDto, invalidCreateUserDto);
      const errors = await validate(createUserDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation if email is invalid', async () => {
      const invalidCreateUserDto = {
        name: 'Test User For Create',
        email: 'invalid-email-format',
        password: 'password123456',
      };

      const createUserDto = plainToInstance(CreateUserDto, invalidCreateUserDto);
      const errors = await validate(createUserDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints).toHaveProperty('isEmail');
    });

    it('should fail validation if password is too short', async () => {
      const invalidCreateUserDto = {
        name: 'Test User For Create',
        email: 'createuser@example.com',
        password: 'pwd', // Too short
      };

      const createUserDto = plainToInstance(CreateUserDto, invalidCreateUserDto);
      const errors = await validate(createUserDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
      expect(errors[0].constraints).toHaveProperty('minLength');
    });
  });
});