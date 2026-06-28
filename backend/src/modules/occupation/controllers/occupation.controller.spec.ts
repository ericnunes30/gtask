import { Test, type TestingModule } from '@nestjs/testing';
import {
  type INestApplication,
  type CanActivate,
  HttpStatus,
  type ExecutionContext,
} from '@nestjs/common';
import request from 'supertest';
import { OccupationController } from './occupation.controller';
import { OccupationService } from '../services/occupation.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Occupation } from '../entities/occupation.entity';

const mockJwtAuthGuard: CanActivate = {
  canActivate(_context: ExecutionContext) {
    return true;
  },
};

const createMockOccupation = (overrides?: Partial<Occupation>): Occupation =>
  Object.assign(new Occupation(), {
    id: 1,
    name: 'Developer',
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
    projects: [],
    tasks: [],
    ...overrides,
  });

describe('OccupationController', () => {
  let app: INestApplication;
  let occupationService: jest.Mocked<OccupationService>;

  beforeAll(async () => {
    occupationService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      addUserToOccupation: jest.fn(),
      removeUserFromOccupation: jest.fn(),
    } as unknown as jest.Mocked<OccupationService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OccupationController],
      providers: [{ provide: OccupationService, useValue: occupationService }],
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

  describe('POST /occupations', () => {
    it('should return 201 with created occupation', async () => {
      occupationService.create.mockResolvedValue(createMockOccupation());

      const response = await request(app.getHttpServer())
        .post('/occupations')
        .send({ name: 'Developer' })
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({ id: 1, name: 'Developer' });
    });
  });

  describe('GET /occupations', () => {
    it('should return 200 with list of occupations', async () => {
      occupationService.findAll.mockResolvedValue([createMockOccupation()]);

      const response = await request(app.getHttpServer())
        .get('/occupations')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ id: 1, name: 'Developer' });
    });
  });

  describe('GET /occupations/:id', () => {
    it('should return 200 with an occupation', async () => {
      occupationService.findOne.mockResolvedValue(createMockOccupation());

      const response = await request(app.getHttpServer())
        .get('/occupations/1')
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({ id: 1, name: 'Developer' });
      expect(occupationService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('PUT /occupations/:id', () => {
    it('should return 200 with updated occupation', async () => {
      occupationService.update.mockResolvedValue(
        createMockOccupation({ name: 'Senior Developer' }),
      );

      const response = await request(app.getHttpServer())
        .put('/occupations/1')
        .send({ name: 'Senior Developer' })
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({ name: 'Senior Developer' });
      expect(occupationService.update).toHaveBeenCalledWith(
        1,
        expect.any(Object),
      );
    });
  });

  describe('DELETE /occupations/:id', () => {
    it('should return 200', async () => {
      occupationService.remove.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/occupations/1')
        .expect(HttpStatus.OK);

      expect(occupationService.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('POST /occupations/:id/users', () => {
    it('should return 201 with updated occupation', async () => {
      const occupation = createMockOccupation();
      occupationService.addUserToOccupation.mockResolvedValue(occupation);

      const response = await request(app.getHttpServer())
        .post('/occupations/1/users')
        .send({ userId: 2 })
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({ id: 1 });
      expect(occupationService.addUserToOccupation).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('DELETE /occupations/:id/users/:userId', () => {
    it('should return 200', async () => {
      occupationService.removeUserFromOccupation.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/occupations/1/users/2')
        .expect(HttpStatus.OK);

      expect(occupationService.removeUserFromOccupation).toHaveBeenCalledWith(
        1,
        2,
      );
    });
  });
});
