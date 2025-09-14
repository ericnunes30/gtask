import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    roles: [{ id: 1, name: 'user' }],
  };

  const mockAuthResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: mockUser,
  };

  const mockAuthService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
    register: jest.fn(),
    verifyToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should call authService.login with correct credentials and return auth response', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw UnauthorizedException when authService.login throws', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle edge case with empty email', async () => {
      const loginDto: LoginDto = {
        email: '',
        password: 'password123',
      };

      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle edge case with empty password', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: '',
      };

      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should call authService.refreshToken with refresh token and return new access token', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'mock-refresh-token',
      };

      const newAccessToken = { accessToken: 'new-access-token' };
      mockAuthService.refreshToken.mockResolvedValue(newAccessToken);

      const result = await controller.refreshToken(refreshTokenDto);

      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
      expect(result).toEqual(newAccessToken);
    });

    it('should throw UnauthorizedException when authService.refreshToken throws', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'invalid-token',
      };

      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid or expired refresh token'),
      );

      await expect(controller.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle empty refresh token', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: '',
      };

      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid or expired refresh token'),
      );

      await expect(controller.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should call authService.register with register DTO and return user', async () => {
      const registerDto: RegisterDto = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
      };

      mockAuthService.register.mockResolvedValue(mockUser);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockUser);
    });

    it('should handle registration with minimal valid data', async () => {
      const registerDto: RegisterDto = {
        name: 'A',
        email: 'a@b.com',
        password: '123456',
      };

      mockAuthService.register.mockResolvedValue({ id: 2, ...registerDto });

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual({ id: 2, ...registerDto });
    });

    it('should propagate any errors from authService.register', async () => {
      const registerDto: RegisterDto = {
        name: 'New User',
        email: 'existing@example.com',
        password: 'password123',
      };

      mockAuthService.register.mockRejectedValue(new Error('Email already exists'));

      await expect(controller.register(registerDto)).rejects.toThrow('Email already exists');
    });
  });

  describe('getProfile', () => {
    it('should return user from request object when authenticated', () => {
      const mockRequest = {
        user: mockUser,
      };

      const result = controller.getProfile(mockRequest as any);

      expect(result).toEqual(mockUser);
    });

    it('should handle case where user object is minimal', () => {
      const minimalUser = { id: 1, email: 'test@example.com' };
      const mockRequest = {
        user: minimalUser,
      };

      const result = controller.getProfile(mockRequest as any);

      expect(result).toEqual(minimalUser);
    });

    it('should handle case where user object has additional properties', () => {
      const extendedUser = {
        ...mockUser,
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: { theme: 'dark' },
      };
      const mockRequest = {
        user: extendedUser,
      };

      const result = controller.getProfile(mockRequest as any);

      expect(result).toEqual(extendedUser);
    });
  });

  describe('verifyToken', () => {
    it('should return validation response with user data when token is valid', async () => {
      const mockRequest = {
        user: mockUser,
      };

      const result = await controller.verifyToken(mockRequest as any);

      expect(result).toEqual({
        valid: true,
        user: mockUser,
      });
    });

    it('should handle case where user object is null or undefined', async () => {
      const mockRequest = {
        user: null,
      };

      const result = await controller.verifyToken(mockRequest as any);

      expect(result).toEqual({
        valid: true,
        user: null,
      });
    });

    it('should handle case where user object has minimal data', async () => {
      const minimalUser = { sub: 1 };
      const mockRequest = {
        user: minimalUser,
      };

      const result = await controller.verifyToken(mockRequest as any);

      expect(result).toEqual({
        valid: true,
        user: minimalUser,
      });
    });
  });

  describe('controller initialization', () => {
    it('should be properly initialized with AuthService', () => {
      expect(controller).toBeDefined();
      expect(authService).toBeDefined();
    });
  });
});