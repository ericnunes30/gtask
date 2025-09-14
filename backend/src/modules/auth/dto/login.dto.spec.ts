import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  let loginDto: LoginDto;

  beforeEach(() => {
    loginDto = new LoginDto();
  });

  describe('email validation', () => {
    it('should pass with valid email', async () => {
      loginDto.email = 'test@example.com';
      loginDto.password = 'password123';

      const errors = await validate(loginDto);
      expect(errors.length).toBe(0);
    });

    it('should fail with empty email', async () => {
      loginDto.email = '';
      loginDto.password = 'password123';

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('should fail with null email', async () => {
      loginDto.email = null as any;
      loginDto.password = 'password123';

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('should fail with undefined email', async () => {
      loginDto.email = undefined as any;
      loginDto.password = 'password123';

      const errors = await validate(loginDto);
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
        'invalid@email.c',
      ];

      for (const email of invalidEmails) {
        loginDto.email = email;
        loginDto.password = 'password123';

        const errors = await validate(loginDto);
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
        'very.long.email.address@domain.with.many.subdomains.com',
      ];

      for (const email of validEmails) {
        loginDto.email = email;
        loginDto.password = 'password123';

        const errors = await validate(loginDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle email with special characters', async () => {
      const specialEmails = [
        'test+special@example.com',
        'user.tag@domain.com',
        'user_name@example.com',
        'test.email@sub-domain.example.com',
      ];

      for (const email of specialEmails) {
        loginDto.email = email;
        loginDto.password = 'password123';

        const errors = await validate(loginDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle email with numbers', async () => {
      loginDto.email = 'user123@example.com';
      loginDto.password = 'password123';

      const errors = await validate(loginDto);
      expect(errors.length).toBe(0);
    });

    it('should handle very long email', async () => {
      loginDto.email = 'a'.repeat(100) + '@example.com';
      loginDto.password = 'password123';

      const errors = await validate(loginDto);
      expect(errors.length).toBe(0);
    });

    it('should handle email with leading/trailing whitespace', async () => {
      loginDto.email = '  test@example.com  ';
      loginDto.password = 'password123';

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });
  });

  describe('password validation', () => {
    it('should pass with valid password (6+ characters)', async () => {
      loginDto.email = 'test@example.com';
      loginDto.password = 'password123';

      const errors = await validate(loginDto);
      expect(errors.length).toBe(0);
    });

    it('should fail with empty password', async () => {
      loginDto.email = 'test@example.com';
      loginDto.password = '';

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it('should fail with null password', async () => {
      loginDto.email = 'test@example.com';
      loginDto.password = null as any;

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it('should fail with undefined password', async () => {
      loginDto.email = 'test@example.com';
      loginDto.password = undefined as any;

      const errors = await validate(loginDto);
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
        loginDto.email = 'test@example.com';
        loginDto.password = password;

        const errors = await validate(loginDto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.property === 'password')).toBe(true);
      }
    });

    it('should pass with exactly 6 characters', async () => {
      loginDto.email = 'test@example.com';
      loginDto.password = '123456';

      const errors = await validate(loginDto);
      expect(errors.length).toBe(0);
    });

    it('should pass with long passwords', async () => {
      const longPasswords = [
        'a'.repeat(50),
        'password123!@#$%^&*()',
        'veryLongPasswordWithNumbers123AndSymbols!@#$%',
        'P@ssw0rdWithMixedCase123',
      ];

      for (const password of longPasswords) {
        loginDto.email = 'test@example.com';
        loginDto.password = password;

        const errors = await validate(loginDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle password with special characters', async () => {
      const specialPasswords = [
        'password!@#$%^&*()',
        'P@ssw0rd',
        'password123!',
        'user_password123',
        'password with spaces',
        'password\nwith\tnewlines',
      ];

      for (const password of specialPasswords) {
        loginDto.email = 'test@example.com';
        loginDto.password = password;

        const errors = await validate(loginDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle password with unicode characters', async () => {
      const unicodePasswords = [
        'пароль123',
        '密碼123',
        'password123漢字',
        'motdepasse123',
      ];

      for (const password of unicodePasswords) {
        loginDto.email = 'test@example.com';
        loginDto.password = password;

        const errors = await validate(loginDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle password with leading/trailing whitespace', async () => {
      loginDto.email = 'test@example.com';
      loginDto.password = '  password123  ';

      const errors = await validate(loginDto);
      expect(errors.length).toBe(0);
    });

    it('should handle password with only whitespace', async () => {
      loginDto.email = 'test@example.com';
      loginDto.password = '     ';

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });
  });

  describe('combined validation', () => {
    it('should pass with both valid email and password', async () => {
      loginDto.email = 'test@example.com';
      loginDto.password = 'password123';

      const errors = await validate(loginDto);
      expect(errors.length).toBe(0);
    });

    it('should fail when both email and password are invalid', async () => {
      loginDto.email = 'invalid-email';
      loginDto.password = '123';

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(1);
      expect(errors.some(error => error.property === 'email')).toBe(true);
      expect(errors.some(error => error.property === 'password')).toBe(true);
    });

    it('should fail when email is invalid and password is valid', async () => {
      loginDto.email = 'invalid-email';
      loginDto.password = 'password123';

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'email')).toBe(true);
    });

    it('should fail when email is valid and password is invalid', async () => {
      loginDto.email = 'test@example.com';
      loginDto.password = '123';

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'password')).toBe(true);
    });

    it('should fail when both fields are empty', async () => {
      loginDto.email = '';
      loginDto.password = '';

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(1);
      expect(errors.some(error => error.property === 'email')).toBe(true);
      expect(errors.some(error => error.property === 'password')).toBe(true);
    });

    it('should fail when both fields are null', async () => {
      loginDto.email = null as any;
      loginDto.password = null as any;

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(1);
      expect(errors.some(error => error.property === 'email')).toBe(true);
      expect(errors.some(error => error.property === 'password')).toBe(true);
    });

    it('should fail when both fields are undefined', async () => {
      loginDto.email = undefined as any;
      loginDto.password = undefined as any;

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(1);
      expect(errors.some(error => error.property === 'email')).toBe(true);
      expect(errors.some(error => error.property === 'password')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle email with maximum allowed length', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      loginDto.email = longEmail;
      loginDto.password = 'password123';

      const errors = await validate(loginDto);
      expect(errors.length).toBe(0);
    });

    it('should handle password with maximum practical length', async () => {
      const longPassword = 'a'.repeat(1000);
      loginDto.email = 'test@example.com';
      loginDto.password = longPassword;

      const errors = await validate(loginDto);
      expect(errors.length).toBe(0);
    });

    it('should handle email with international characters', async () => {
      const internationalEmails = [
        '测试@example.com',
        'täst@example.com',
        'tëst@example.com',
        'tést@example.com',
        'töst@example.com',
      ];

      for (const email of internationalEmails) {
        loginDto.email = email;
        loginDto.password = 'password123';

        const errors = await validate(loginDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle JSON injection attempts', async () => {
      const maliciousInputs = [
        '{"email":"test@example.com"}',
        'test@example.com"; DROP TABLE users;--',
        '<script>alert("xss")</script>',
        'test@example.com<script>alert("xss")</script>',
      ];

      for (const email of maliciousInputs) {
        loginDto.email = email;
        loginDto.password = 'password123';

        const errors = await validate(loginDto);
        // These may or may not be valid emails, but should not cause crashes
        expect(Array.isArray(errors)).toBe(true);
      }
    });
  });

  describe('type checking', () => {
    it('should handle numeric email (invalid)', async () => {
      loginDto.email = 123 as any;
      loginDto.password = 'password123';

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'email')).toBe(true);
    });

    it('should handle boolean email (invalid)', async () => {
      loginDto.email = true as any;
      loginDto.password = 'password123';

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'email')).toBe(true);
    });

    it('should handle object email (invalid)', async () => {
      loginDto.email = { email: 'test@example.com' } as any;
      loginDto.password = 'password123';

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'email')).toBe(true);
    });

    it('should handle array email (invalid)', async () => {
      loginDto.email = ['test@example.com'] as any;
      loginDto.password = 'password123';

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'email')).toBe(true);
    });

    it('should handle numeric password (invalid type but valid length)', async () => {
      loginDto.email = 'test@example.com';
      loginDto.password = 1234567 as any;

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'password')).toBe(true);
    });

    it('should handle boolean password (invalid)', async () => {
      loginDto.email = 'test@example.com';
      loginDto.password = true as any;

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'password')).toBe(true);
    });

    it('should handle object password (invalid)', async () => {
      loginDto.email = 'test@example.com';
      loginDto.password = { password: 'password123' } as any;

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'password')).toBe(true);
    });

    it('should handle array password (invalid)', async () => {
      loginDto.email = 'test@example.com';
      loginDto.password = ['password123'] as any;

      const errors = await validate(loginDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'password')).toBe(true);
    });
  });
});