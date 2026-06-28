import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  CanActivate,
  INestApplication,
} from '@nestjs/common';
import supertest from 'supertest';
import { CommentController } from './comment.controller';
import { CommentService } from '../services/comment.service';
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

const mockComment = {
  id: 1,
  content: 'Comment content',
  task_id: 1,
  userId: 1,
  parentId: null,
  likesCount: 0,
};

const mockCommentService = {
  findAll: jest.fn().mockResolvedValue([mockComment]),
  findOne: jest.fn().mockResolvedValue(mockComment),
  create: jest.fn().mockResolvedValue(mockComment),
  update: jest
    .fn()
    .mockResolvedValue({ ...mockComment, content: 'Updated content' }),
  remove: jest.fn().mockResolvedValue(undefined),
  findByTaskId: jest.fn().mockResolvedValue([mockComment]),
  likeComment: jest.fn().mockResolvedValue(undefined),
  unlikeComment: jest.fn().mockResolvedValue(undefined),
} as unknown as CommentService;

describe('CommentController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [CommentController],
      providers: [{ provide: CommentService, useValue: mockCommentService }],
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

  describe('GET /comments', () => {
    it('should return 200 and all comments', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/comments')
        .expect(200);

      expect(response.body).toEqual([mockComment]);
      expect(mockCommentService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return 200 and comments by task', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/comments?task=1')
        .expect(200);

      expect(response.body).toEqual([mockComment]);
      expect(mockCommentService.findByTaskId).toHaveBeenCalledWith(1);
      expect(mockCommentService.findByTaskId).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /comments/:id', () => {
    it('should return 200 and a single comment', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/comments/1')
        .expect(200);

      expect(response.body).toEqual(mockComment);
      expect(mockCommentService.findOne).toHaveBeenCalledWith(1);
      expect(mockCommentService.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /comments', () => {
    it('should return 201 and create a comment', async () => {
      const createCommentDto = {
        content: 'Comment content',
        task_id: 1,
      };
      const response = await supertest(app.getHttpServer())
        .post('/comments')
        .send(createCommentDto)
        .expect(201);

      expect(response.body).toEqual(mockComment);
      expect(mockCommentService.create).toHaveBeenCalledWith(
        createCommentDto,
        mockUser.sub,
      );
      expect(mockCommentService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('PUT /comments/:id', () => {
    it('should return 200 and update a comment', async () => {
      const updateCommentDto = { content: 'Updated content' };
      const response = await supertest(app.getHttpServer())
        .put('/comments/1')
        .send(updateCommentDto)
        .expect(200);

      expect(response.body).toEqual({
        ...mockComment,
        content: 'Updated content',
      });
      expect(mockCommentService.update).toHaveBeenCalledWith(
        1,
        updateCommentDto,
      );
      expect(mockCommentService.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE /comments/:id', () => {
    it('should return 200 and remove a comment', async () => {
      await supertest(app.getHttpServer()).delete('/comments/1').expect(200);

      expect(mockCommentService.remove).toHaveBeenCalledWith(1);
      expect(mockCommentService.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /comments/:id/like', () => {
    it('should return 201 and like a comment', async () => {
      await supertest(app.getHttpServer()).post('/comments/1/like').expect(201);

      expect(mockCommentService.likeComment).toHaveBeenCalledWith(
        1,
        mockUser.sub,
      );
      expect(mockCommentService.likeComment).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE /comments/:id/like', () => {
    it('should return 200 and unlike a comment', async () => {
      await supertest(app.getHttpServer())
        .delete('/comments/1/like')
        .expect(200);

      expect(mockCommentService.unlikeComment).toHaveBeenCalledWith(
        1,
        mockUser.sub,
      );
      expect(mockCommentService.unlikeComment).toHaveBeenCalledTimes(1);
    });
  });
});
