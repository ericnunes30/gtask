/* eslint-disable sonarjs/no-hardcoded-passwords */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../../user/services/user.service';
import { PasswordVerificationFactory } from '../strategies/password/password-verification.factory';
describe('AuthService', () => {
  let service: AuthService;
  let userService: {
    findByEmail: jest.Mock;
    count: jest.Mock;
    createFirstAdmin: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
  };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let passwordVerificationFactory: {
    getStrategy: jest.Mock;
  };
  let configService: { get: jest.Mock };

  const mockUser = {
    id: 1,
    name: 'User',
    email: 'user@example.com',
    password: 'hashed-password',
    roles: [{ name: 'ADMIN' }],
  };

  beforeEach(async () => {
    userService = {
      findByEmail: jest.fn(),
      count: jest.fn(),
      createFirstAdmin: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
      verify: jest.fn(),
    };
    passwordVerificationFactory = {
      getStrategy: jest.fn().mockReturnValue({
        verify: jest.fn().mockResolvedValue(true),
      }),
    };
    configService = {
      get: jest.fn().mockReturnValue('secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: PasswordVerificationFactory,
          useValue: passwordVerificationFactory,
        },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.validateUser('user@example.com', 'password');

      expect(result).toEqual(expect.objectContaining({ id: mockUser.id }));
      expect(passwordVerificationFactory.getStrategy).toHaveBeenCalledWith(
        mockUser.password,
      );
    });

    it('should return null when user not found', async () => {
      userService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser(
        'missing@example.com',
        'password',
      );

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      passwordVerificationFactory.getStrategy.mockReturnValue({
        verify: jest.fn().mockResolvedValue(false),
      });

      const result = await service.validateUser('user@example.com', 'wrong');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return tokens and user on valid credentials', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'user@example.com',
        password: 'password',
      });

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.user).toEqual(expect.objectContaining({ id: mockUser.id }));
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'missing@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens when refresh token is valid', async () => {
      jwtService.verify.mockReturnValue({ sub: 1 });
      userService.findOne.mockResolvedValue(mockUser);

      const result = await service.refreshToken('valid-refresh');

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyToken', () => {
    it('should return decoded token payload', () => {
      const payload = { sub: 1, email: 'user@example.com', name: 'User' };
      jwtService.verify.mockReturnValue(payload);

      const result = service.verifyToken('access-token');

      expect(result).toEqual(payload);
      expect(jwtService.verify).toHaveBeenCalledWith('access-token');
    });

    it('should throw UnauthorizedException when token is invalid', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      expect(() => service.verifyToken('invalid-token')).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('checkSetupStatus', () => {
    it('should return needsSetup true when no users exist', async () => {
      userService.count.mockResolvedValue(0);

      const result = await service.checkSetupStatus();

      expect(result.needsSetup).toBe(true);
    });

    it('should return needsSetup false when users exist', async () => {
      userService.count.mockResolvedValue(5);

      const result = await service.checkSetupStatus();

      expect(result.needsSetup).toBe(false);
    });
  });

  describe('setupFirstUser', () => {
    it('should create first admin and return tokens', async () => {
      userService.count.mockResolvedValue(0);
      userService.createFirstAdmin.mockResolvedValue(mockUser);

      const result = await service.setupFirstUser({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'password',
      });

      expect(result.accessToken).toBe('signed-token');
      expect(result.user).toEqual(mockUser);
    });

    it('should throw ForbiddenException when setup already completed', async () => {
      userService.count.mockResolvedValue(1);

      await expect(
        service.setupFirstUser({
          name: 'Admin',
          email: 'admin@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
