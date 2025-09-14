import { Test, TestingModule } from '@nestjs/testing';
import { UserValidationFactory, StandardUserValidationStrategy } from './user-validation.factory';
import { UserService } from '../../user/services/user.service';
import { PasswordVerificationFactory } from '../strategies/password/password-verification.factory';
import { NotFoundException } from '@nestjs/common';

describe('UserValidationFactory', () => {
  let factory: UserValidationFactory;
  let userService: UserService;
  let passwordFactory: PasswordVerificationFactory;
  let standardStrategy: StandardUserValidationStrategy;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    password: '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7L0p5w5d5j5d5j5d5j5d5j5d5j5d',
    roles: [{ id: 1, name: 'user' }],
  };

  const mockUserWithoutPassword = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    roles: [{ id: 1, name: 'user' }],
  };

  beforeEach(async () => {
    const mockUserService = {
      findByEmail: jest.fn(),
    };

    const mockPasswordFactory = {
      getStrategy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserValidationFactory,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: PasswordVerificationFactory,
          useValue: mockPasswordFactory,
        },
      ],
    }).compile();

    factory = module.get<UserValidationFactory>(UserValidationFactory);
    userService = module.get<UserService>(UserService);
    passwordFactory = module.get<PasswordVerificationFactory>(PasswordVerificationFactory);
    standardStrategy = new StandardUserValidationStrategy(userService, passwordFactory);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be properly initialized with dependencies', () => {
      expect(factory).toBeDefined();
      expect(userService).toBeDefined();
      expect(passwordFactory).toBeDefined();
    });
  });

  describe('validateUser', () => {
    it('should successfully validate user with correct credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      
      const mockPasswordStrategy = {
        verify: jest.fn().mockResolvedValue(true),
      };
      (passwordFactory.getStrategy as jest.Mock).mockReturnValue(mockPasswordStrategy);

      const result = await factory.validateUser(email, password);

      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(passwordFactory.getStrategy).toHaveBeenCalledWith(mockUser.password);
      expect(mockPasswordStrategy.verify).toHaveBeenCalledWith(password, mockUser.password);
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should return null when user is not found', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      (userService.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await factory.validateUser(email, password);

      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(passwordFactory.getStrategy).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when user has no password', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const userWithoutPassword = { ...mockUser, password: undefined };

      (userService.findByEmail as jest.Mock).mockResolvedValue(userWithoutPassword);

      const result = await factory.validateUser(email, password);

      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(passwordFactory.getStrategy).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when password verification fails', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      
      const mockPasswordStrategy = {
        verify: jest.fn().mockResolvedValue(false),
      };
      (passwordFactory.getStrategy as jest.Mock).mockReturnValue(mockPasswordStrategy);

      const result = await factory.validateUser(email, password);

      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(passwordFactory.getStrategy).toHaveBeenCalledWith(mockUser.password);
      expect(mockPasswordStrategy.verify).toHaveBeenCalledWith(password, mockUser.password);
      expect(result).toBeNull();
    });

    it('should handle errors from password verification gracefully', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      
      const mockPasswordStrategy = {
        verify: jest.fn().mockRejectedValue(new Error('Verification error')),
      };
      (passwordFactory.getStrategy as jest.Mock).mockReturnValue(mockPasswordStrategy);

      const result = await factory.validateUser(email, password);

      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(passwordFactory.getStrategy).toHaveBeenCalledWith(mockUser.password);
      expect(mockPasswordStrategy.verify).toHaveBeenCalledWith(password, mockUser.password);
      expect(result).toBeNull();
    });

    it('should handle errors from userService.findByEmail', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      (userService.findByEmail as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(factory.validateUser(email, password)).rejects.toThrow('Database error');
    });

    it('should handle errors from passwordFactory.getStrategy', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (passwordFactory.getStrategy as jest.Mock).mockRejectedValue(new Error('Factory error'));

      await expect(factory.validateUser(email, password)).rejects.toThrow('Factory error');
    });

    it('should handle empty email and password', async () => {
      const email = '';
      const password = '';

      (userService.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await factory.validateUser(email, password);

      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(result).toBeNull();
    });

    it('should handle very long email and password', async () => {
      const email = 'a'.repeat(100) + '@example.com';
      const password = 'a'.repeat(200);

      (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      
      const mockPasswordStrategy = {
        verify: jest.fn().mockResolvedValue(true),
      };
      (passwordFactory.getStrategy as jest.Mock).mockReturnValue(mockPasswordStrategy);

      const result = await factory.validateUser(email, password);

      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(passwordFactory.getStrategy).toHaveBeenCalledWith(mockUser.password);
      expect(mockPasswordStrategy.verify).toHaveBeenCalledWith(password, mockUser.password);
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should handle special characters in email and password', async () => {
      const email = 'test+special@example.com';
      const password = 'p@ssw0rd!@#$%^&*()';

      (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      
      const mockPasswordStrategy = {
        verify: jest.fn().mockResolvedValue(true),
      };
      (passwordFactory.getStrategy as jest.Mock).mockReturnValue(mockPasswordStrategy);

      const result = await factory.validateUser(email, password);

      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(passwordFactory.getStrategy).toHaveBeenCalledWith(mockUser.password);
      expect(mockPasswordStrategy.verify).toHaveBeenCalledWith(password, mockUser.password);
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should handle unicode characters in email and password', async () => {
      const email = 'тест@example.com';
      const password = 'пароль123';

      (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      
      const mockPasswordStrategy = {
        verify: jest.fn().mockResolvedValue(true),
      };
      (passwordFactory.getStrategy as jest.Mock).mockReturnValue(mockPasswordStrategy);

      const result = await factory.validateUser(email, password);

      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(passwordFactory.getStrategy).toHaveBeenCalledWith(mockUser.password);
      expect(mockPasswordStrategy.verify).toHaveBeenCalledWith(password, mockUser.password);
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should handle case where user has empty string password', async () => {
      const email = 'test@example.com';
      const password = '';
      const userWithEmptyPassword = { ...mockUser, password: '' };

      (userService.findByEmail as jest.Mock).mockResolvedValue(userWithEmptyPassword);
      
      const mockPasswordStrategy = {
        verify: jest.fn().mockResolvedValue(false),
      };
      (passwordFactory.getStrategy as jest.Mock).mockReturnValue(mockPasswordStrategy);

      const result = await factory.validateUser(email, password);

      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(passwordFactory.getStrategy).toHaveBeenCalledWith(userWithEmptyPassword.password);
      expect(mockPasswordStrategy.verify).toHaveBeenCalledWith(password, userWithEmptyPassword.password);
      expect(result).toBeNull();
    });

    it('should handle case where user object has additional properties', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const extendedUser = {
        ...mockUser,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        preferences: { theme: 'dark' },
      };

      (userService.findByEmail as jest.Mock).mockResolvedValue(extendedUser);
      
      const mockPasswordStrategy = {
        verify: jest.fn().mockResolvedValue(true),
      };
      (passwordFactory.getStrategy as jest.Mock).mockReturnValue(mockPasswordStrategy);

      const result = await factory.validateUser(email, password);

      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(passwordFactory.getStrategy).toHaveBeenCalledWith(extendedUser.password);
      expect(mockPasswordStrategy.verify).toHaveBeenCalledWith(password, extendedUser.password);
      expect(result).toEqual({
        id: extendedUser.id,
        email: extendedUser.email,
        name: extendedUser.name,
        roles: extendedUser.roles,
      });
    });

    it('should handle case where user object is missing required properties', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const minimalUser = {
        id: 1,
        email: 'test@example.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7L0p5w5d5j5d5j5d5j5d5j5d5j5d',
      };

      (userService.findByEmail as jest.Mock).mockResolvedValue(minimalUser);
      
      const mockPasswordStrategy = {
        verify: jest.fn().mockResolvedValue(true),
      };
      (passwordFactory.getStrategy as jest.Mock).mockReturnValue(mockPasswordStrategy);

      const result = await factory.validateUser(email, password);

      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(passwordFactory.getStrategy).toHaveBeenCalledWith(minimalUser.password);
      expect(mockPasswordStrategy.verify).toHaveBeenCalledWith(password, minimalUser.password);
      expect(result).toEqual({
        id: minimalUser.id,
        email: minimalUser.email,
      });
    });

    it('should handle null or undefined inputs gracefully', async () => {
      const testCases = [
        { email: null as any, password: 'password123' },
        { email: undefined as any, password: 'password123' },
        { email: 'test@example.com', password: null as any },
        { email: 'test@example.com', password: undefined as any },
      ];

      for (const testCase of testCases) {
        (userService.findByEmail as jest.Mock).mockResolvedValue(null);

        const result = await factory.validateUser(testCase.email, testCase.password);

        expect(result).toBeNull();
      }
    });
  });

  describe('StandardUserValidationStrategy', () => {
    let strategy: StandardUserValidationStrategy;

    beforeEach(() => {
      strategy = new StandardUserValidationStrategy(userService, passwordFactory);
    });

    describe('canHandle', () => {
      it('should always return true (fallback strategy)', () => {
        expect(strategy.canHandle('any@email.com', 'anypassword')).toBe(true);
        expect(strategy.canHandle('', '')).toBe(true);
        expect(strategy.canHandle(null as any, null as any)).toBe(true);
        expect(strategy.canHandle(undefined as any, undefined as any)).toBe(true);
      });
    });

    describe('validate', () => {
      it('should validate user with correct credentials', async () => {
        const email = 'test@example.com';
        const password = 'password123';

        (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
        
        const mockPasswordStrategy = {
          verify: jest.fn().mockResolvedValue(true),
        };
        (passwordFactory.getStrategy as jest.Mock).mockReturnValue(mockPasswordStrategy);

        const result = await strategy.validate(email, password);

        expect(userService.findByEmail).toHaveBeenCalledWith(email);
        expect(passwordFactory.getStrategy).toHaveBeenCalledWith(mockUser.password);
        expect(mockPasswordStrategy.verify).toHaveBeenCalledWith(password, mockUser.password);
        expect(result).toEqual(mockUserWithoutPassword);
      });

      it('should return null when user is not found', async () => {
        const email = 'nonexistent@example.com';
        const password = 'password123';

        (userService.findByEmail as jest.Mock).mockResolvedValue(null);

        const result = await strategy.validate(email, password);

        expect(userService.findByEmail).toHaveBeenCalledWith(email);
        expect(result).toBeNull();
      });

      it('should return null when user has no password', async () => {
        const email = 'test@example.com';
        const password = 'password123';
        const userWithoutPassword = { ...mockUser, password: undefined };

        (userService.findByEmail as jest.Mock).mockResolvedValue(userWithoutPassword);

        const result = await strategy.validate(email, password);

        expect(userService.findByEmail).toHaveBeenCalledWith(email);
        expect(result).toBeNull();
      });

      it('should return null when password verification fails', async () => {
        const email = 'test@example.com';
        const password = 'wrongpassword';

        (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
        
        const mockPasswordStrategy = {
          verify: jest.fn().mockResolvedValue(false),
        };
        (passwordFactory.getStrategy as jest.Mock).mockReturnValue(mockPasswordStrategy);

        const result = await strategy.validate(email, password);

        expect(userService.findByEmail).toHaveBeenCalledWith(email);
        expect(passwordFactory.getStrategy).toHaveBeenCalledWith(mockUser.password);
        expect(mockPasswordStrategy.verify).toHaveBeenCalledWith(password, mockUser.password);
        expect(result).toBeNull();
      });

      it('should handle password verification errors gracefully', async () => {
        const email = 'test@example.com';
        const password = 'password123';

        (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
        
        const mockPasswordStrategy = {
          verify: jest.fn().mockRejectedValue(new Error('Verification error')),
        };
        (passwordFactory.getStrategy as jest.Mock).mockReturnValue(mockPasswordStrategy);

        const result = await strategy.validate(email, password);

        expect(userService.findByEmail).toHaveBeenCalledWith(email);
        expect(passwordFactory.getStrategy).toHaveBeenCalledWith(mockUser.password);
        expect(mockPasswordStrategy.verify).toHaveBeenCalledWith(password, mockUser.password);
        expect(result).toBeNull();
      });

      it('should properly exclude password from returned user object', async () => {
        const email = 'test@example.com';
        const password = 'password123';

        (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
        
        const mockPasswordStrategy = {
          verify: jest.fn().mockResolvedValue(true),
        };
        (passwordFactory.getStrategy as jest.Mock).mockReturnValue(mockPasswordStrategy);

        const result = await strategy.validate(email, password);

        expect(result).not.toHaveProperty('password');
        expect(result).toEqual(mockUserWithoutPassword);
      });
    });
  });

  describe('factory initialization', () => {
    it('should initialize with correct strategy', () => {
      const strategies = (factory as any).strategies;
      
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBeInstanceOf(StandardUserValidationStrategy);
    });
  });
});