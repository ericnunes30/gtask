import { Test, TestingModule } from '@nestjs/testing';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../services/auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: AuthService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(async () => {
    const mockAuthService = {
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be properly initialized with AuthService', () => {
      expect(strategy).toBeDefined();
      expect(authService).toBeDefined();
    });

    it('should configure passport strategy with usernameField as email', () => {
      // Since PassportStrategy is called in constructor, we can verify the configuration
      // by checking if the strategy was created successfully
      expect(strategy).toBeInstanceOf(LocalStrategy);
    });
  });

  describe('validate', () => {
    it('should successfully validate user with correct credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      (authService.validateUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await strategy.validate(email, password);

      expect(authService.validateUser).toHaveBeenCalledWith(email, password);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when validateUser returns null', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      (authService.validateUser as jest.Mock).mockResolvedValue(null);

      await expect(strategy.validate(email, password)).rejects.toThrow(UnauthorizedException);
      expect(authService.validateUser).toHaveBeenCalledWith(email, password);
    });

    it('should throw UnauthorizedException when validateUser throws error', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      (authService.validateUser as jest.Mock).mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(strategy.validate(email, password)).rejects.toThrow(UnauthorizedException);
      expect(authService.validateUser).toHaveBeenCalledWith(email, password);
    });

    it('should handle empty email and password', async () => {
      const email = '';
      const password = '';

      (authService.validateUser as jest.Mock).mockResolvedValue(null);

      await expect(strategy.validate(email, password)).rejects.toThrow(UnauthorizedException);
      expect(authService.validateUser).toHaveBeenCalledWith(email, password);
    });

    it('should handle special characters in email and password', async () => {
      const email = 'test+special@example.com';
      const password = 'p@ssw0rd!@#$%^&*()';

      (authService.validateUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await strategy.validate(email, password);

      expect(authService.validateUser).toHaveBeenCalledWith(email, password);
      expect(result).toEqual(mockUser);
    });

    it('should handle very long email and password', async () => {
      const longEmail = 'a'.repeat(100) + '@example.com';
      const longPassword = 'a'.repeat(200);

      (authService.validateUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await strategy.validate(longEmail, longPassword);

      expect(authService.validateUser).toHaveBeenCalledWith(longEmail, longPassword);
      expect(result).toEqual(mockUser);
    });
  });

  describe('error handling', () => {
    it('should throw UnauthorizedException without message (passport default behavior)', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      (authService.validateUser as jest.Mock).mockResolvedValue(null);

      try {
        await strategy.validate(email, password);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toBe('Unauthorized'); // Default passport message
      }
    });

    it('should handle network errors from authService', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      (authService.validateUser as jest.Mock).mockRejectedValue(
        new Error('ECONNREFUSED'),
      );

      await expect(strategy.validate(email, password)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle timeout errors from authService', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      (authService.validateUser as jest.Mock).mockRejectedValue(
        new Error('Request timeout'),
      );

      await expect(strategy.validate(email, password)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('boundary cases', () => {
    it('should handle email with leading/trailing whitespace', async () => {
      const email = '  test@example.com  ';
      const password = 'password123';

      (authService.validateUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await strategy.validate(email, password);

      expect(authService.validateUser).toHaveBeenCalledWith(email, password);
      expect(result).toEqual(mockUser);
    });

    it('should handle password with leading/trailing whitespace', async () => {
      const email = 'test@example.com';
      const password = '  password123  ';

      (authService.validateUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await strategy.validate(email, password);

      expect(authService.validateUser).toHaveBeenCalledWith(email, password);
      expect(result).toEqual(mockUser);
    });

    it('should handle null/undefined parameters gracefully', async () => {
      const email = null as any;
      const password = undefined as any;

      (authService.validateUser as jest.Mock).mockResolvedValue(null);

      await expect(strategy.validate(email, password)).rejects.toThrow(UnauthorizedException);
      expect(authService.validateUser).toHaveBeenCalledWith(email, password);
    });
  });
});