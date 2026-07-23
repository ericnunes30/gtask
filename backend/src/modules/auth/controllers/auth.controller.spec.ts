import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  CanActivate,
  INestApplication,
} from '@nestjs/common';
import supertest from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { SetupGuard } from '../../../common/guards/setup.guard';

const mockUser: Express.User = {
  sub: 1,
  email: 'test@example.com',
  name: 'Test User',
  username: 'testuser',
  roles: ['USER'],
};

const mockAuthGuard: CanActivate = {
  canActivate: jest.fn((context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();
    req.user = mockUser;
    return true;
  }),
};

const mockSetupGuard: CanActivate = {
  canActivate: jest.fn(() => true),
};

const mockAuthService = {
  login: jest.fn().mockResolvedValue({
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: { id: 1, email: 'test@example.com' },
  }),
  refreshToken: jest.fn().mockResolvedValue({
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
  }),
  checkSetupStatus: jest.fn().mockResolvedValue({ needsSetup: false }),
  setupFirstUser: jest.fn().mockResolvedValue({
    id: 1,
    email: 'admin@example.com',
    name: 'Admin',
  }),
  register: jest.fn().mockResolvedValue({
    id: 2,
    email: 'user@example.com',
    name: 'User',
  }),
  verifyToken: jest.fn().mockReturnValue({
    sub: 1,
    email: 'test@example.com',
    name: 'Test User',
  }),
} as unknown as AuthService;

describe('AuthController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue(mockAuthGuard)
      .overrideGuard(SetupGuard)
      .useValue(mockSetupGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should return 200 and tokens on login', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const response = await supertest(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(201);

      expect(response.body).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 1, email: 'test@example.com' },
      });
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return 200 and new tokens on refresh', async () => {
      const refreshDto = { refreshToken: 'old-refresh-token' };
      const response = await supertest(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(201);

      expect(response.body).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        'old-refresh-token',
      );
      expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /auth/setup-status', () => {
    it('should return 200 and setup status', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/auth/setup-status')
        .expect(200);

      expect(response.body).toEqual({ needsSetup: false });
      expect(mockAuthService.checkSetupStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /auth/setup', () => {
    it('should return 201 and created admin on setup', async () => {
      const setupDto = {
        name: 'Admin',
        email: 'admin@example.com',
        password: 'password123',
      };
      const response = await supertest(app.getHttpServer())
        .post('/auth/setup')
        .send(setupDto)
        .expect(201);

      expect(response.body).toEqual({
        id: 1,
        email: 'admin@example.com',
        name: 'Admin',
      });
      expect(mockAuthService.setupFirstUser).toHaveBeenCalledWith(setupDto);
      expect(mockAuthService.setupFirstUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /auth/register', () => {
    it('should return 201 and registered user', async () => {
      const registerDto = {
        name: 'User',
        email: 'user@example.com',
        password: 'password123',
      };
      const response = await supertest(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toEqual({
        id: 2,
        email: 'user@example.com',
        name: 'User',
      });
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /auth/profile', () => {
    it('should return 200 and current user profile', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/auth/profile')
        .expect(200);

      expect(response.body).toEqual(mockUser);
    });

    it('should apply AuthGuard', async () => {
      await supertest(app.getHttpServer()).get('/auth/profile').expect(200);
      expect(mockAuthGuard.canActivate).toHaveBeenCalled();
    });
  });

  describe('POST /auth/verify', () => {
    it('should return 200 and valid user object', async () => {
      const response = await supertest(app.getHttpServer())
        .post('/auth/verify')
        .expect(201);

      expect(response.body).toEqual({
        valid: true,
        user: mockUser,
      });
    });

    it('should apply AuthGuard', async () => {
      await supertest(app.getHttpServer()).post('/auth/verify').expect(201);
      expect(mockAuthGuard.canActivate).toHaveBeenCalled();
    });
  });
});
