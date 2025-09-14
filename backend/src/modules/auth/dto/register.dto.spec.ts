import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  let registerDto: RegisterDto;

  beforeEach(() => {
    registerDto = new RegisterDto();
  });

  describe('name validation', () => {
    it('should pass with valid name', async () => {
      registerDto.name = 'John Doe';
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBe(0);
    });

    it('should pass with minimal valid name (1 character)', async () => {
      registerDto.name = 'A';
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBe(0);
    });

    it('should pass with maximum allowed name length (255 characters)', async () => {
      registerDto.name = 'a'.repeat(255);
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBe(0);
    });

    it('should fail with empty name', async () => {
      registerDto.name = '';
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should fail with null name', async () => {
      registerDto.name = null as any;
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should fail with undefined name', async () => {
      registerDto.name = undefined as any;
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should fail with name longer than 255 characters', async () => {
      registerDto.name = 'a'.repeat(256);
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should handle name with special characters', async () => {
      const specialNames = [
        'John O\'Connor',
        'Mary-Jane Smith',
        'Jean-Claude Van Damme',
        'José María',
        'Müller',
        '张三', // Chinese
        'Иван', // Cyrillic
        'John Doe Jr.',
        'Dr. John Smith',
        'Prof. Jane Doe',
      ];

      for (const name of specialNames) {
        registerDto.name = name;
        registerDto.email = 'test@example.com';
        registerDto.password = 'password123';

        const errors = await validate(registerDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle name with numbers', async () => {
      registerDto.name = 'John Doe 2';
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBe(0);
    });

    it('should handle name with leading/trailing whitespace', async () => {
      registerDto.name = '  John Doe  ';
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBe(0);
    });

    it('should handle name with only whitespace', async () => {
      registerDto.name = '     ';
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBe(0);
    });

    it('should handle name with newlines and tabs', async () => {
      registerDto.name = 'John\nDoe\tSmith';
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBe(0);
    });
  });

  describe('email validation', () => {
    it('should pass with valid email', async () => {
      registerDto.name = 'John Doe';
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBe(0);
    });

    it('should fail with empty email', async () => {
      registerDto.name = 'John Doe';
      registerDto.email = '';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('should fail with null email', async () => {
      registerDto.name = 'John Doe';
      registerDto.email = null as any;
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('should fail with undefined email', async () => {
      registerDto.name = 'John Doe';
      registerDto.email = undefined as any;
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('should fail with invalid email format', async () => {
      const invalidEmails = [
        'invalid-email',
        'invalid@',
        '@example.com',
        'invalid.email@',
        'invalid@email.',
        'invalid@emailcom',
        'inv alid@email.com',
      ];

      for (const email of invalidEmails) {
        registerDto.name = 'John Doe';
        registerDto.email = email;
        registerDto.password = 'password123';

        const errors = await validate(registerDto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'email')).toBe(true);
      }
    });

    it('should pass with valid email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user_name@example.io',
        '123@example.com',
        'test.email+alias@sub.domain.com',
        'a@b.co',
      ];

      for (const email of validEmails) {
        registerDto.name = 'John Doe';
        registerDto.email = email;
        registerDto.password = 'password123';

        const errors = await validate(registerDto);
        expect(errors.length).toBe(0);
      }
    });
  });

  describe('password validation', () => {
    it('should pass with valid password (6+ characters)', async () => {
      registerDto.name = 'John Doe';
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBe(0);
    });

    it('should fail with empty password', async () => {
      registerDto.name = 'John Doe';
      registerDto.email = 'test@example.com';
      registerDto.password = '';

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it('should fail with null password', async () => {
      registerDto.name = 'John Doe';
      registerDto.email = 'test@example.com';
      registerDto.password = null as any;

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it('should fail with undefined password', async () => {
      registerDto.name = 'John Doe';
      registerDto.email = 'test@example.com';
      registerDto.password = undefined as any;

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it('should fail with password shorter than 6 characters', async () => {
      const shortPasswords = [
        'a',
        'ab',
        'abc',
        'abcd',
        'abcde',
        '12345',
      ];

      for (const password of shortPasswords) {
        registerDto.name = 'John Doe';
        registerDto.email = 'test@example.com';
        registerDto.password = password;

        const errors = await validate(registerDto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'password')).toBe(true);
      }
    });

    it('should pass with exactly 6 characters', async () => {
      registerDto.name = 'John Doe';
      registerDto.email = 'test@example.com';
      registerDto.password = '123456';

      const errors = await validate(registerDto);
      expect(errors.length).toBe(0);
    });

    it('should pass with long passwords', async () => {
      const longPasswords = [
        'a'.repeat(50),
        'password123!@#$%^&*()',
        'veryLongPasswordWithNumbers123AndSymbols!@#$%',
      ];

      for (const password of longPasswords) {
        registerDto.name = 'John Doe';
        registerDto.email = 'test@example.com';
        registerDto.password = password;

        const errors = await validate(registerDto);
        expect(errors.length).toBe(0);
      }
    });
  });

  describe('combined validation', () => {
    it('should pass with all valid fields', async () => {
      registerDto.name = 'John Doe';
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBe(0);
    });

    it('should fail when all fields are empty', async () => {
      registerDto.name = '';
      registerDto.email = '';
      registerDto.password = '';

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(2);
      expect(errors.some(error => error.property === 'name')).toBe(true);
      expect(errors.some(error => error.property === 'email')).toBe(true);
      expect(errors.some(error => error.property === 'password')).toBe(true);
    });

    it('should fail when all fields are null', async () => {
      registerDto.name = null as any;
      registerDto.email = null as any;
      registerDto.password = null as any;

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(2);
      expect(errors.some(error => error.property === 'name')).toBe(true);
      expect(errors.some(error => error.property === 'email')).toBe(true);
      expect(errors.some(error => error.property === 'password')).toBe(true);
    });

    it('should fail when multiple fields are invalid', async () => {
      registerDto.name = 'a'.repeat(300); // Too long
      registerDto.email = 'invalid-email';
      registerDto.password = '123'; // Too short

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(2);
      expect(errors.some(error => error.property === 'name')).toBe(true);
      expect(errors.some(error => error.property === 'email')).toBe(true);
      expect(errors.some(error => error.property === 'password')).toBe(true);
    });

    it('should handle partial validation errors', async () => {
      registerDto.name = 'John Doe'; // Valid
      registerDto.email = 'invalid-email'; // Invalid
      registerDto.password = 'password123'; // Valid

      const errors = await validate(registerDto);
      expect(errors.length).toBe(1);
      expect(errors[0].property).toBe('email');
    });
  });

  describe('edge cases and security', () => {
    it('should handle SQL injection attempts in name', async () => {
      const maliciousNames = [
        "Robert'); DROP TABLE users; --",
        '<script>alert("xss")</script>',
        'admin\'--',
        '1 OR 1=1',
      ];

      for (const name of maliciousNames) {
        registerDto.name = name;
        registerDto.email = 'test@example.com';
        registerDto.password = 'password123';

        const errors = await validate(registerDto);
        // These are valid strings, so they should pass string validation
        expect(errors.length).toBe(0);
      }
    });

    it('should handle HTML/JavaScript injection attempts in email', async () => {
      const maliciousEmails = [
        '<script>alert("xss")</script>@example.com',
        'test@example.com<script>alert("xss")</script>',
        'test@example.com"><script>alert("xss")</script>',
      ];

      for (const email of maliciousEmails) {
        registerDto.name = 'John Doe';
        registerDto.email = email;
        registerDto.password = 'password123';

        const errors = await validate(registerDto);
        // These may or may not be valid emails, but should not cause crashes
        expect(Array.isArray(errors)).toBe(true);
      }
    });

    it('should handle very long inputs', async () => {
      registerDto.name = 'a'.repeat(255); // Max length
      registerDto.email = 'a'.repeat(100) + '@example.com';
      registerDto.password = 'a'.repeat(100);

      const errors = await validate(registerDto);
      expect(errors.length).toBe(0);
    });

    it('should handle unicode characters in all fields', async () => {
      registerDto.name = '张三';
      registerDto.email = '测试@example.com';
      registerDto.password = '密码123';

      const errors = await validate(registerDto);
      expect(errors.length).toBe(0);
    });

    it('should handle mixed case in email', async () => {
      registerDto.name = 'John Doe';
      registerDto.email = 'TeSt@ExAmPlE.CoM';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBe(0);
    });
  });

  describe('type checking', () => {
    it('should handle numeric name', async () => {
      registerDto.name = 123 as any;
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'name')).toBe(true);
    });

    it('should handle boolean name', async () => {
      registerDto.name = true as any;
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'name')).toBe(true);
    });

    it('should handle array name', async () => {
      registerDto.name = ['John Doe'] as any;
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'name')).toBe(true);
    });

    it('should handle object name', async () => {
      registerDto.name = { first: 'John', last: 'Doe' } as any;
      registerDto.email = 'test@example.com';
      registerDto.password = 'password123';

      const errors = await validate(registerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'name')).toBe(true);
    });
  });

  describe('practical validation scenarios', () => {
    it('should accept common name formats', async () => {
      const commonNames = [
        'John Smith',
        'Jane Doe',
        'Bob Johnson',
        'Alice Williams',
        'Charlie Brown',
        'Diana Prince',
        'Edward Norton',
        'Fiona Apple',
        'George Lucas',
        'Helen Mirren',
      ];

      for (const name of commonNames) {
        registerDto.name = name;
        registerDto.email = 'test@example.com';
        registerDto.password = 'password123';

        const errors = await validate(registerDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should accept common email formats', async () => {
      const commonEmails = [
        'john.smith@example.com',
        'jane.doe@company.co.uk',
        'bob.johnson@gmail.com',
        'alice.williams@university.edu',
        'charlie.brown@organization.org',
      ];

      for (const email of commonEmails) {
        registerDto.name = 'Test User';
        registerDto.email = email;
        registerDto.password = 'password123';

        const errors = await validate(registerDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should accept reasonable passwords', async () => {
      const reasonablePasswords = [
        'password123',
        'SecurePass123!',
        'MyPassword2024',
        'user_password_123',
        'P@ssw0rd',
        'letmein123',
        'welcome1',
        'admin123',
      ];

      for (const password of reasonablePasswords) {
        registerDto.name = 'Test User';
        registerDto.email = 'test@example.com';
        registerDto.password = password;

        const errors = await validate(registerDto);
        expect(errors.length).toBe(0);
      }
    });
  });
});