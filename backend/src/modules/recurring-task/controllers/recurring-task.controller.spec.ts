import { Test, type TestingModule } from '@nestjs/testing';
import {
  type INestApplication,
  type CanActivate,
  HttpStatus,
  type ExecutionContext,
} from '@nestjs/common';
import request from 'supertest';
import { RecurringTaskController } from './recurring-task.controller';
import { RecurringTaskService } from '../services/recurring-task.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RecurringTask, ScheduleType } from '../entities/recurring-task.entity';
import { PriorityLevel } from '../../tasks/entities/enums';

const mockUser: Express.User = {
  sub: 1,
  email: 'test@example.com',
  name: 'Test User',
};

const mockJwtAuthGuard: CanActivate = {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = mockUser;
    return true;
  },
};

const createMockRecurringTask = (
  overrides?: Partial<RecurringTask>,
): RecurringTask =>
  Object.assign(new RecurringTask(), {
    id: 1,
    name: 'Weekly Report',
    templateData: {
      title: 'Weekly Report',
      priority: PriorityLevel.MEDIUM,
      assignee_ids: [1],
      occupation_ids: [1],
    },
    next_due_date: new Date('2024-01-08'),
    is_active: true,
    schedule_type: ScheduleType.INTERVAL,
    frequency_interval: '1 week',
    frequency_cron: null,
    userId: 1,
    projectId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {} as RecurringTask['user'],
    project: {} as RecurringTask['project'],
    tasks: [],
    ...overrides,
  });

describe('RecurringTaskController', () => {
  let app: INestApplication;
  let recurringTaskService: jest.Mocked<RecurringTaskService>;

  beforeAll(async () => {
    recurringTaskService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<RecurringTaskService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecurringTaskController],
      providers: [
        { provide: RecurringTaskService, useValue: recurringTaskService },
      ],
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

  describe('GET /recurring-tasks', () => {
    it('should return 200 with list of recurring tasks', async () => {
      recurringTaskService.findAll.mockResolvedValue([
        createMockRecurringTask(),
      ]);

      const response = await request(app.getHttpServer())
        .get('/recurring-tasks')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ id: 1, name: 'Weekly Report' });
    });
  });

  describe('GET /recurring-tasks/:id', () => {
    it('should return 200 with a recurring task', async () => {
      recurringTaskService.findOne.mockResolvedValue(createMockRecurringTask());

      const response = await request(app.getHttpServer())
        .get('/recurring-tasks/1')
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({ id: 1, name: 'Weekly Report' });
      expect(recurringTaskService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('POST /recurring-tasks', () => {
    it('should return 201 with created recurring task', async () => {
      recurringTaskService.create.mockResolvedValue(createMockRecurringTask());

      const response = await request(app.getHttpServer())
        .post('/recurring-tasks')
        .send({
          name: 'Weekly Report',
          schedule_type: ScheduleType.INTERVAL,
          projectId: 1,
          templateData: {
            title: 'Weekly Report',
            priority: PriorityLevel.MEDIUM,
            assignee_ids: [1],
            occupation_ids: [1],
          },
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({ id: 1, name: 'Weekly Report' });
      expect(recurringTaskService.create).toHaveBeenCalledWith(
        expect.any(Object),
        mockUser.sub,
      );
    });
  });

  describe('PUT /recurring-tasks/:id', () => {
    it('should return 200 with updated recurring task', async () => {
      recurringTaskService.update.mockResolvedValue(
        createMockRecurringTask({ name: 'Daily Report' }),
      );

      const response = await request(app.getHttpServer())
        .put('/recurring-tasks/1')
        .send({ name: 'Daily Report' })
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({ name: 'Daily Report' });
      expect(recurringTaskService.update).toHaveBeenCalledWith(
        1,
        expect.any(Object),
      );
    });
  });

  describe('DELETE /recurring-tasks/:id', () => {
    it('should return 200', async () => {
      recurringTaskService.remove.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/recurring-tasks/1')
        .expect(HttpStatus.OK);

      expect(recurringTaskService.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('Error paths and edge cases', () => {
    it('should propagate service error as 500 when create throws', async () => {
      recurringTaskService.create.mockRejectedValue(new Error('DB error'));

      const response = await request(app.getHttpServer())
        .post('/recurring-tasks')
        .send({
          name: 'Weekly Report',
          schedule_type: ScheduleType.INTERVAL,
          projectId: 1,
          templateData: {
            title: 'Weekly Report',
            priority: PriorityLevel.MEDIUM,
            assignee_ids: [1],
            occupation_ids: [1],
          },
        })
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(recurringTaskService.create).toHaveBeenCalledTimes(1);
    });

    it('should propagate service error as 500 when findOne throws', async () => {
      recurringTaskService.findOne.mockRejectedValue(new Error('not found'));

      await request(app.getHttpServer())
        .get('/recurring-tasks/1')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
