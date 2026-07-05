import { Test, type TestingModule } from '@nestjs/testing';
import {
  type INestApplication,
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import request from 'supertest';
import { ActivityLogController } from './activity-log.controller';
import { ActivityLogService } from '../services/activity-log.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

const mockUser: Express.User = {
  sub: 1,
  email: 'test@example.com',
  name: 'Test User',
};

const mockJwtGuard: CanActivate = {
  canActivate: jest.fn((context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();
    req.user = mockUser;
    return true;
  }),
};

const mockActivityLogService = {
  findAll: jest.fn().mockResolvedValue([]),
  findByTaskId: jest.fn().mockResolvedValue([]),
} as unknown as jest.Mocked<ActivityLogService>;

describe('ActivityLogController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityLogController],
      providers: [
        { provide: ActivityLogService, useValue: mockActivityLogService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
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

  describe('GET /activity-logs', () => {
    it('should return 200 and call findAll with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/activity-logs')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual([]);
      expect(mockActivityLogService.findAll).toHaveBeenCalledWith({
        taskId: undefined,
        userId: undefined,
        actionType: undefined,
        page: 1,
        limit: 20,
      });
      expect(mockActivityLogService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return 200 and call findAll with query params', async () => {
      await request(app.getHttpServer())
        .get(
          '/activity-logs?taskId=1&userId=2&actionType=create&page=2&limit=10',
        )
        .expect(HttpStatus.OK);

      expect(mockActivityLogService.findAll).toHaveBeenCalledWith({
        taskId: '1',
        userId: '2',
        actionType: 'create',
        page: '2',
        limit: '10',
      });
      expect(mockActivityLogService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /activity-logs/task/:taskId', () => {
    it('should return 200 and call findByTaskId with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/activity-logs/task/1')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual([]);
      expect(mockActivityLogService.findByTaskId).toHaveBeenCalledWith(
        '1',
        1,
        20,
      );
      expect(mockActivityLogService.findByTaskId).toHaveBeenCalledTimes(1);
    });

    it('should return 200 and call findByTaskId with query params', async () => {
      await request(app.getHttpServer())
        .get('/activity-logs/task/1?page=2&limit=10')
        .expect(HttpStatus.OK);

      expect(mockActivityLogService.findByTaskId).toHaveBeenCalledWith(
        '1',
        '2',
        '10',
      );
      expect(mockActivityLogService.findByTaskId).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error paths and edge cases', () => {
    it('should apply default pagination when only taskId is provided', async () => {
      await request(app.getHttpServer())
        .get('/activity-logs?taskId=5')
        .expect(HttpStatus.OK);

      expect(mockActivityLogService.findAll).toHaveBeenCalledWith({
        taskId: '5',
        userId: undefined,
        actionType: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('should apply default pagination when only actionType is provided', async () => {
      await request(app.getHttpServer())
        .get('/activity-logs?actionType=update')
        .expect(HttpStatus.OK);

      expect(mockActivityLogService.findAll).toHaveBeenCalledWith({
        taskId: undefined,
        userId: undefined,
        actionType: 'update',
        page: 1,
        limit: 20,
      });
    });
  });
});
