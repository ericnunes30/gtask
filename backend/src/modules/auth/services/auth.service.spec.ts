import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/services/user.service';
import { TokenPayloadFactory } from '../factories/token-payload.factory';
import { AuthResponseFactory } from '../factories/auth-response.factory';
import { UserValidationFactory } from '../factories/user-validation.factory';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { UnauthorizedException } from '@nestjs/common';
import { Logger } from '@nestjs/common';

jest.mock('@nestjs/common');

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;
  let tokenPayloadFactory: TokenPayloadFactory;
  let authResponseFactory: AuthResponseFactory;
  let userValidationFactory: UserValidationFactory;
  let logger: Logger;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedpassword',
    roles: [{ id: 1, name: 'user' }],
  };

  const mockUserWithoutPassword = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    roles: [{ id: 1, name: 'user' }],
  };

  const mockTokenPayload = {
    email: 'test@example.com',
    sub: 1,
    name: 'Test User',
    roles: ['user'],
  };

  beforeEach(async () => {
    const mockUserService = {
      create: jest.fn(),
      findOne: jest.fn(),
      findByEmail: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockTokenPayloadFactory = {
      createPayload: jest.fn(),
    };

    const mockAuthResponseFactory = {};

    const mockUserValidationFactory = {
      validateUser: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    (Logger as jest.Mock).mockImplementation(() => mockLogger);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: TokenPayloadFactory,
          useValue: mockTokenPayloadFactory,
        },
        {
          provide: AuthResponseFactory,
          useValue: mockAuthResponseFactory,
        },
        {
          provide: UserValidationFactory,
          useValue: mockUserValidationFactory,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    tokenPayloadFactory = module.get<TokenPayloadFactory>(TokenPayloadFactory);
    authResponseFactory = module.get<AuthResponseFactory>(AuthResponseFactory);
    userValidationFactory = module.get<UserValidationFactory>(UserValidationFactory);
    logger = module.get<Logger>(Logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should call userValidationFactory.validateUser with correct parameters', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      (userValidationFactory.validateUser as jest.Mock).mockResolvedValue(mockUserWithoutPassword);

      const result = await service.validateUser(email, password);

      expect(userValidationFactory.validateUser).toHaveBeenCalledWith(email, password);
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should propagate errors from userValidationFactory', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      (userValidationFactory.validateUser as jest.Mock).mockRejectedValue(
        new Error('Validation failed'),
      );

      await expect(service.validateUser(email, password)).rejects.toThrow('Validation failed');
    });

    it('should handle null response from userValidationFactory', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      (userValidationFactory.validateUser as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should successfully login and return tokens with user data', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      (userValidationFactory.validateUser as jest.Mock).mockResolvedValue(mockUserWithoutPassword);
      (tokenPayloadFactory.createPayload as jest.Mock).mockReturnValue(mockTokenPayload);
      (jwtService.sign as jest.Mock)
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(logger.log).toHaveBeenCalledWith(`Login attempt for email: ${loginDto.email}`);
      expect(userValidationFactory.validateUser).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(tokenPayloadFactory.createPayload).toHaveBeenCalledWith(mockUserWithoutPassword, 'extended');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(jwtService.sign).toHaveBeenCalledWith(mockTokenPayload, { expiresIn: '15m' });
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: mockUser.id }, { expiresIn: '7d' });
      expect(logger.log).toHaveBeenCalledWith(`Successfully created access and refresh tokens for user ${mockUser.email}`);
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUserWithoutPassword,
      });
    });

    it('should throw UnauthorizedException when validateUser returns null', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      (userValidationFactory.validateUser as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(logger.log).toHaveBeenCalledWith(`Login attempt for email: ${loginDto.email}`);
    });

    it('should throw UnauthorizedException when validateUser throws error', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      (userValidationFactory.validateUser as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle case where user has no roles', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const userWithoutRoles = { ...mockUserWithoutPassword, roles: [] };

      (userValidationFactory.validateUser as jest.Mock).mockResolvedValue(userWithoutRoles);
      (tokenPayloadFactory.createPayload as jest.Mock).mockReturnValue({
        ...mockTokenPayload,
        roles: [],
      });
      (jwtService.sign as jest.Mock)
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: userWithoutRoles,
      });
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: 1, exp: Date.now() / 1000 + 3600 };

      (jwtService.verify as jest.Mock).mockReturnValue(payload);
      (userService.findOne as jest.Mock).mockResolvedValue(mockUserWithoutPassword);
      (tokenPayloadFactory.createPayload as jest.Mock).mockReturnValue(mockTokenPayload);
      (jwtService.sign as jest.Mock).mockReturnValue('new-access-token');

      const result = await service.refreshToken(refreshToken);

      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken);
      expect(userService.findOne).toHaveBeenCalledWith(payload.sub);
      expect(tokenPayloadFactory.createPayload).toHaveBeenCalledWith(mockUserWithoutPassword, 'extended');
      expect(jwtService.sign).toHaveBeenCalledWith(mockTokenPayload, { expiresIn: '15m' });
      expect(result).toEqual({ accessToken: 'new-access-token' });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      const refreshToken = 'invalid-refresh-token';

      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: 999, exp: Date.now() / 1000 + 3600 };

      (jwtService.verify as jest.Mock).mockReturnValue(payload);
      (userService.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle JWT verification errors', async () => {
      const refreshToken = 'malformed-token';

      (jwtService.verify as jest.Mock).mockImplementation(() => {
        const error = new Error('jwt malformed');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle expired tokens', async () => {
      const refreshToken = 'expired-token';

      (jwtService.verify as jest.Mock).mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should call userService.create with register DTO and return user', async () => {
      const registerDto: RegisterDto = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
      };

      (userService.create as jest.Mock).mockResolvedValue(mockUserWithoutPassword);

      const result = await service.register(registerDto);

      expect(userService.create).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should propagate errors from userService.create', async () => {
      const registerDto: RegisterDto = {
        name: 'New User',
        email: 'existing@example.com',
        password: 'password123',
      };

      (userService.create as jest.Mock).mockRejectedValue(new Error('Email already exists'));

      await expect(service.register(registerDto)).rejects.toThrow('Email already exists');
    });

    it('should handle case where userService.create returns user with password', async () => {
      const registerDto: RegisterDto = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
      };

      const userWithPassword = { ...mockUser };
      (userService.create as jest.Mock).mockResolvedValue(userWithPassword);

      const result = await service.register(registerDto);

      expect(result).toEqual(userWithPassword);
    });
  });

  describe('verifyToken', () => {
    it('should successfully verify valid token', async () => {
      const token = 'valid-token';
      const payload = { sub: 1, email: 'test@example.com', exp: Date.now() / 1000 + 3600 };

      (jwtService.verify as jest.Mock).mockReturnValue(payload);

      const result = await service.verifyToken(token);

      expect(jwtService.verify).toHaveBeenCalledWith(token);
      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const token = 'invalid-token';

      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.verifyToken(token)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle various JWT error types', async () => {
      const errorTypes = [
        { name: 'JsonWebTokenError', message: 'invalid signature' },
        { name: 'TokenExpiredError', message: 'jwt expired' },
        { name: 'NotBeforeError', message: 'jwt not active' },
      ];

      for (const errorType of errorTypes) {
        const token = 'problematic-token';

        (jwtService.verify as jest.Mock).mockImplementation(() => {
          const error = new Error(errorType.message);
          error.name = errorType.name;
          throw error;
        });

        await expect(service.verifyToken(token)).rejects.toThrow(UnauthorizedException);
      }
    });

    it('should handle empty token', async () => {
      const token = '';

      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt must be provided');
      });

      await expect(service.verifyToken(token)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('service initialization', () => {
    it('should be properly initialized with all dependencies', () => {
      expect(service).toBeDefined();
      expect(userService).toBeDefined();
      expect(jwtService).toBeDefined();
      expect(tokenPayloadFactory).toBeDefined();
      expect(authResponseFactory).toBeDefined();
      expect(userValidationFactory).toBeDefined();
      expect(logger).toBeDefined();
    });

    it('should have logger instance with correct name', () => {
      expect(Logger).toHaveBeenCalledWith(AuthService.name);
    });
  });
});