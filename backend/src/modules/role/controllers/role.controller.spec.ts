import { Test, type TestingModule } from '@nestjs/testing';
import {
  type INestApplication,
  type CanActivate,
  HttpStatus,
  type ExecutionContext,
} from '@nestjs/common';
import request from 'supertest';
import { RoleController } from './role.controller';
import { RoleService } from '../services/role.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Role } from '../entities/role.entity';

const mockJwtAuthGuard: CanActivate = {
  canActivate(_context: ExecutionContext) {
    return true;
  },
};

const createMockRole = (overrides?: Partial<Role>): Role =>
  Object.assign(new Role(), {
    id: 1,
    name: 'admin',
    description: 'Administrator role',
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
    ...overrides,
  });

describe('RoleController', () => {
  let app: INestApplication;
  let roleService: jest.Mocked<RoleService>;

  beforeAll(async () => {
    roleService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<RoleService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [{ provide: RoleService, useValue: roleService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /roles', () => {
    it('should return 201 with created role', async () => {
      roleService.create.mockResolvedValue(createMockRole());

      const response = await request(app.getHttpServer())
        .post('/roles')
        .send({ name: 'admin', description: 'Administrator role' })
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({ id: 1, name: 'admin' });
    });
  });

  describe('GET /roles', () => {
    it('should return 200 with list of roles', async () => {
      roleService.findAll.mockResolvedValue([createMockRole()]);

      const response = await request(app.getHttpServer())
        .get('/roles')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ id: 1, name: 'admin' });
    });
  });

  describe('GET /roles/:id', () => {
    it('should return 200 with a role', async () => {
      roleService.findOne.mockResolvedValue(createMockRole());

      const response = await request(app.getHttpServer())
        .get('/roles/1')
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({ id: 1, name: 'admin' });
      expect(roleService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('PUT /roles/:id', () => {
    it('should return 200 with updated role', async () => {
      roleService.update.mockResolvedValue(
        createMockRole({ name: 'superadmin' }),
      );

      const response = await request(app.getHttpServer())
        .put('/roles/1')
        .send({ name: 'superadmin' })
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({ name: 'superadmin' });
      expect(roleService.update).toHaveBeenCalledWith(1, expect.any(Object));
    });
  });

  describe('DELETE /roles/:id', () => {
    it('should return 200', async () => {
      roleService.remove.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/roles/1')
        .expect(HttpStatus.OK);

      expect(roleService.remove).toHaveBeenCalledWith(1);
    });
  });
});
