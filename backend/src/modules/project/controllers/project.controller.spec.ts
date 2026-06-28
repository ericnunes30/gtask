import { Test, type TestingModule } from '@nestjs/testing';
import {
  type INestApplication,
  type CanActivate,
  HttpStatus,
  type ExecutionContext,
} from '@nestjs/common';
import request from 'supertest';
import { ProjectController } from './project.controller';
import { ProjectService } from '../services/project.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Project } from '../entities/project.entity';
import { PriorityLevel } from '../../tasks/entities/enums';

const mockJwtAuthGuard: CanActivate = {
  canActivate(_context: ExecutionContext) {
    return true;
  },
};

const createMockProject = (overrides?: Partial<Project>): Project =>
  Object.assign(new Project(), {
    id: 1,
    title: 'Test Project',
    description: null,
    status: true,
    priority: PriorityLevel.MEDIUM,
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-12-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
    users: [],
    occupations: [],
    ...overrides,
  });

describe('ProjectController', () => {
  let app: INestApplication;
  let projectService: jest.Mocked<ProjectService>;

  beforeAll(async () => {
    projectService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findProjectTasks: jest.fn(),
    } as unknown as jest.Mocked<ProjectService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [{ provide: ProjectService, useValue: projectService }],
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

  describe('POST /projects', () => {
    it('should return 201 with created project', async () => {
      const project = createMockProject();
      projectService.create.mockResolvedValue(project);

      const response = await request(app.getHttpServer())
        .post('/projects')
        .send({
          title: 'New Project',
          status: true,
          priority: PriorityLevel.HIGH,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({ id: 1, title: 'Test Project' });
    });
  });

  describe('GET /projects', () => {
    it('should return 200 with list of projects', async () => {
      projectService.findAll.mockResolvedValue([createMockProject()]);

      const response = await request(app.getHttpServer())
        .get('/projects')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ id: 1, title: 'Test Project' });
    });
  });

  describe('GET /projects/:id', () => {
    it('should return 200 with a project', async () => {
      projectService.findOne.mockResolvedValue(createMockProject());

      const response = await request(app.getHttpServer())
        .get('/projects/1')
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({ id: 1 });
      expect(projectService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('PUT /projects/:id', () => {
    it('should return 200 with updated project', async () => {
      projectService.update.mockResolvedValue(
        createMockProject({ title: 'Updated' }),
      );

      const response = await request(app.getHttpServer())
        .put('/projects/1')
        .send({ title: 'Updated' })
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({ title: 'Updated' });
      expect(projectService.update).toHaveBeenCalledWith(1, expect.any(Object));
    });
  });

  describe('DELETE /projects/:id', () => {
    it('should return 200', async () => {
      projectService.remove.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/projects/1')
        .expect(HttpStatus.OK);

      expect(projectService.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /projects/:id/tasks', () => {
    it('should return 200 with project tasks', async () => {
      projectService.findProjectTasks.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/projects/1/tasks')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual([]);
      expect(projectService.findProjectTasks).toHaveBeenCalledWith(1);
    });
  });
});
