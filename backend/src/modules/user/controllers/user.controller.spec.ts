import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  CanActivate,
  INestApplication,
} from '@nestjs/common';
import supertest from 'supertest';
import { UserController } from './user.controller';
import { UserService } from '../services/user.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

const mockUser: Express.User = {
  sub: 1,
  email: 'test@example.com',
  name: 'Test User',
  username: 'testuser',
  roles: ['USER'],
};

const mockJwtGuard: CanActivate = {
  canActivate: jest.fn((context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();
    req.user = mockUser;
    return true;
  }),
};

const mockUserService = {
  findAll: jest.fn().mockResolvedValue([
    { id: 1, name: 'User One', email: 'one@example.com' },
    { id: 2, name: 'User Two', email: 'two@example.com' },
  ]),
  findOne: jest.fn().mockResolvedValue({
    id: 1,
    name: 'User One',
    email: 'one@example.com',
  }),
  create: jest.fn().mockResolvedValue({
    id: 3,
    name: 'User Three',
    email: 'three@example.com',
  }),
  update: jest.fn().mockResolvedValue({
    id: 1,
    name: 'Updated User',
    email: 'updated@example.com',
  }),
  remove: jest.fn().mockResolvedValue(undefined),
  findByEmail: jest.fn().mockResolvedValue({
    id: 1,
    name: 'User One',
    email: 'one@example.com',
  }),
  assignRoles: jest.fn().mockResolvedValue({
    id: 1,
    name: 'User One',
    roles: [{ id: 1, name: 'ADMIN' }],
  }),
  assignOccupations: jest.fn().mockResolvedValue({
    id: 1,
    name: 'User One',
    occupations: [{ id: 1, name: 'Developer' }],
  }),
} as unknown as UserService;

describe('UserController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
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

  describe('GET /users', () => {
    it('should return 200 and a list of users', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body).toEqual([
        { id: 1, name: 'User One', email: 'one@example.com' },
        { id: 2, name: 'User Two', email: 'two@example.com' },
      ]);
      expect(mockUserService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /users/:id', () => {
    it('should return 200 and a single user', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/users/1')
        .expect(200);

      expect(response.body).toEqual({
        id: 1,
        name: 'User One',
        email: 'one@example.com',
      });
      expect(mockUserService.findOne).toHaveBeenCalledWith(1);
      expect(mockUserService.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /users', () => {
    it('should return 201 and create a user', async () => {
      const createUserDto = {
        name: 'User Three',
        email: 'three@example.com',
        password: 'password123', // eslint-disable-line sonarjs/no-hardcoded-passwords
      };
      const response = await supertest(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toEqual({
        id: 3,
        name: 'User Three',
        email: 'three@example.com',
      });
      expect(mockUserService.create).toHaveBeenCalledWith(createUserDto);
      expect(mockUserService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('PUT /users/:id', () => {
    it('should return 200 and update a user', async () => {
      const updateUserDto = { name: 'Updated User' };
      const response = await supertest(app.getHttpServer())
        .put('/users/1')
        .send(updateUserDto)
        .expect(200);

      expect(response.body).toEqual({
        id: 1,
        name: 'Updated User',
        email: 'updated@example.com',
      });
      expect(mockUserService.update).toHaveBeenCalledWith(1, updateUserDto);
      expect(mockUserService.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should return 200 and remove a user', async () => {
      await supertest(app.getHttpServer()).delete('/users/1').expect(200);

      expect(mockUserService.remove).toHaveBeenCalledWith(1);
      expect(mockUserService.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /users/search/:email', () => {
    it('should return 200 and user by email', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/users/search/one@example.com')
        .expect(200);

      expect(response.body).toEqual({
        id: 1,
        name: 'User One',
        email: 'one@example.com',
      });
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        'one@example.com',
      );
      expect(mockUserService.findByEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /users/:id/assign-roles', () => {
    it('should return 201 and assign roles to user', async () => {
      const roleIds = [1, 2];
      const response = await supertest(app.getHttpServer())
        .post('/users/1/assign-roles')
        .send({ roleIds })
        .expect(201);

      expect(response.body).toEqual({
        id: 1,
        name: 'User One',
        roles: [{ id: 1, name: 'ADMIN' }],
      });
      expect(mockUserService.assignRoles).toHaveBeenCalledWith(1, roleIds);
      expect(mockUserService.assignRoles).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /users/:id/assign-occupations', () => {
    it('should return 201 and assign occupations to user', async () => {
      const occupationIds = [1, 2];
      const response = await supertest(app.getHttpServer())
        .post('/users/1/assign-occupations')
        .send({ occupationIds })
        .expect(201);

      expect(response.body).toEqual({
        id: 1,
        name: 'User One',
        occupations: [{ id: 1, name: 'Developer' }],
      });
      expect(mockUserService.assignOccupations).toHaveBeenCalledWith(
        1,
        occupationIds,
      );
      expect(mockUserService.assignOccupations).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error paths and edge cases', () => {
    it('should return 400 when user id is not numeric (GET /:id)', async () => {
      await supertest(app.getHttpServer()).get('/users/abc').expect(400);

      expect(mockUserService.findOne).not.toHaveBeenCalled();
    });

    it('should return 400 when user id is not numeric (DELETE /:id)', async () => {
      await supertest(app.getHttpServer()).delete('/users/abc').expect(400);

      expect(mockUserService.remove).not.toHaveBeenCalled();
    });

    it('should return 400 when user id is not numeric (POST /:id/assign-roles)', async () => {
      await supertest(app.getHttpServer())
        .post('/users/abc/assign-roles')
        .send({ roleIds: [1] })
        .expect(400);

      expect(mockUserService.assignRoles).not.toHaveBeenCalled();
    });
  });
});
