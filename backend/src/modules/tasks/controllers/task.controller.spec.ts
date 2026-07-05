import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  CanActivate,
  INestApplication,
} from '@nestjs/common';
import supertest from 'supertest';
import { TaskController } from './task.controller';
import { TaskService } from '../services/task.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PriorityLevel, Status } from '../entities/enums';

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

const mockTask = {
  id: 1,
  title: 'Task One',
  description: 'Description',
  priority: PriorityLevel.Medium,
  status: Status.Backlog,
  project_id: 1,
  timer: 0,
};

const mockTaskService = {
  findAll: jest.fn().mockResolvedValue([mockTask]),
  findOne: jest.fn().mockResolvedValue(mockTask),
  create: jest.fn().mockResolvedValue(mockTask),
  update: jest.fn().mockResolvedValue({ ...mockTask, title: 'Updated Task' }),
  remove: jest.fn().mockResolvedValue(undefined),
  findByProject: jest.fn().mockResolvedValue([mockTask]),
  findByStatus: jest.fn().mockResolvedValue([mockTask]),
  updateTimer: jest.fn().mockResolvedValue({ ...mockTask, timer: 3600 }),
  assignUsers: jest.fn().mockResolvedValue({
    ...mockTask,
    users: [{ id: 1, name: 'User One' }],
  }),
} as unknown as TaskService;

describe('TaskController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [{ provide: TaskService, useValue: mockTaskService }],
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

  describe('GET /tasks', () => {
    it('should return 200 and all tasks', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/tasks')
        .expect(200);

      expect(response.body).toEqual([mockTask]);
      expect(mockTaskService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return 200 and tasks by project', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/tasks?project=1')
        .expect(200);

      expect(response.body).toEqual([mockTask]);
      expect(mockTaskService.findByProject).toHaveBeenCalledWith(1);
      expect(mockTaskService.findByProject).toHaveBeenCalledTimes(1);
    });

    it('should return 200 and tasks by status', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/tasks?status=pendente')
        .expect(200);

      expect(response.body).toEqual([mockTask]);
      expect(mockTaskService.findByStatus).toHaveBeenCalledWith('pendente');
      expect(mockTaskService.findByStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /tasks/:id', () => {
    it('should return 200 and a single task', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/tasks/1')
        .expect(200);

      expect(response.body).toEqual(mockTask);
      expect(mockTaskService.findOne).toHaveBeenCalledWith(1);
      expect(mockTaskService.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /tasks', () => {
    it('should return 201 and create a task', async () => {
      const createTaskDto = {
        title: 'Task One',
        priority: PriorityLevel.Medium,
        status: Status.Backlog,
        project_id: 1,
      };
      const response = await supertest(app.getHttpServer())
        .post('/tasks')
        .send(createTaskDto)
        .expect(201);

      expect(response.body).toEqual(mockTask);
      expect(mockTaskService.create).toHaveBeenCalledWith(
        createTaskDto,
        mockUser.sub,
      );
      expect(mockTaskService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should return 200 and update a task', async () => {
      const updateTaskDto = { title: 'Updated Task' };
      const response = await supertest(app.getHttpServer())
        .put('/tasks/1')
        .send(updateTaskDto)
        .expect(200);

      expect(response.body).toEqual({ ...mockTask, title: 'Updated Task' });
      expect(mockTaskService.update).toHaveBeenCalledWith(
        1,
        updateTaskDto,
        mockUser.sub,
      );
      expect(mockTaskService.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('should return 200 and patch a task', async () => {
      const updateTaskDto = { title: 'Patched Task' };
      const response = await supertest(app.getHttpServer())
        .patch('/tasks/1')
        .send(updateTaskDto)
        .expect(200);

      expect(response.body).toEqual({ ...mockTask, title: 'Updated Task' });
      expect(mockTaskService.update).toHaveBeenCalledWith(
        1,
        updateTaskDto,
        mockUser.sub,
      );
      expect(mockTaskService.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should return 200 and remove a task', async () => {
      await supertest(app.getHttpServer()).delete('/tasks/1').expect(200);

      expect(mockTaskService.remove).toHaveBeenCalledWith(1);
      expect(mockTaskService.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /tasks/:id/timer', () => {
    it('should return 200 and update timer', async () => {
      const response = await supertest(app.getHttpServer())
        .patch('/tasks/1/timer')
        .send({ timer: 3600 })
        .expect(200);

      expect(response.body).toEqual({ ...mockTask, timer: 3600 });
      expect(mockTaskService.updateTimer).toHaveBeenCalledWith(1, 3600);
      expect(mockTaskService.updateTimer).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /tasks/:id/assign-users', () => {
    it('should return 201 and assign users to task', async () => {
      const userIds = [1, 2];
      const response = await supertest(app.getHttpServer())
        .post('/tasks/1/assign-users')
        .send({ userIds })
        .expect(201);

      expect(response.body).toEqual({
        ...mockTask,
        users: [{ id: 1, name: 'User One' }],
      });
      expect(mockTaskService.assignUsers).toHaveBeenCalledWith(1, userIds);
      expect(mockTaskService.assignUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error paths and edge cases', () => {
    it('should return 400 when task id is not numeric (GET /:id)', async () => {
      await supertest(app.getHttpServer()).get('/tasks/abc').expect(400);

      expect(mockTaskService.findOne).not.toHaveBeenCalled();
    });

    it('should return 400 when task id is not numeric (DELETE /:id)', async () => {
      await supertest(app.getHttpServer()).delete('/tasks/abc').expect(400);

      expect(mockTaskService.remove).not.toHaveBeenCalled();
    });

    it('should log and re-throw when PATCH update throws an Error', async () => {
      const updateError = new Error('Task update failed');
      mockTaskService.update.mockRejectedValueOnce(updateError);

      await supertest(app.getHttpServer())
        .patch('/tasks/1')
        .send({ title: 'Boom' })
        .expect(500);

      expect(mockTaskService.update).toHaveBeenCalledWith(
        1,
        { title: 'Boom' },
        mockUser.sub,
      );
    });

    it('should log String(error) when PATCH update throws a non-Error value', async () => {
      const nonErrorValue: unknown = 'non-error failure';
      mockTaskService.update.mockRejectedValueOnce(nonErrorValue);

      const response = await supertest(app.getHttpServer())
        .patch('/tasks/1')
        .send({ title: 'Boom' })
        .expect(500);

      expect(response.status).toBe(500);
      expect(mockTaskService.update).toHaveBeenCalledWith(
        1,
        { title: 'Boom' },
        mockUser.sub,
      );
    });

    it('should call findAll when neither project nor status query param is provided', async () => {
      await supertest(app.getHttpServer()).get('/tasks').expect(200);

      expect(mockTaskService.findAll).toHaveBeenCalledTimes(1);
      expect(mockTaskService.findByProject).not.toHaveBeenCalled();
      expect(mockTaskService.findByStatus).not.toHaveBeenCalled();
    });
  });
});
