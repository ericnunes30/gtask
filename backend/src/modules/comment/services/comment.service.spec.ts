import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CommentService } from './comment.service';
import { Comment } from '../entities/comment.entity';
import { CommentLike } from '../entities/comment-like.entity';
import { User } from '../../user/entities/user.entity';
import { Task } from '../../tasks/entities/task.entity';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { CommentNotFoundException } from '../exceptions/comment-not-found.exception';
import { UserNotFoundException } from '../../user/exceptions/user-not-found.exception';

type MockRepository<T> = jest.Mocked<Repository<T>>;

function createMockRepository<T>(): MockRepository<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  } as unknown as MockRepository<T>;
}

describe('CommentService', () => {
  let service: CommentService;
  let commentRepository: MockRepository<Comment>;
  let commentLikeRepository: MockRepository<CommentLike>;
  let userRepository: MockRepository<User>;
  let taskRepository: MockRepository<Task>;
  let eventEmitter: { emit: jest.Mock };

  const mockComment = {
    id: 1,
    content: 'Hello',
    taskId: 10,
    userId: 1,
    likesCount: 0,
  } as unknown as Comment;

  beforeEach(async () => {
    commentRepository = createMockRepository<Comment>();
    commentLikeRepository = createMockRepository<CommentLike>();
    userRepository = createMockRepository<User>();
    taskRepository = createMockRepository<Task>();
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: getRepositoryToken(Comment), useValue: commentRepository },
        {
          provide: getRepositoryToken(CommentLike),
          useValue: commentLikeRepository,
        },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Task), useValue: taskRepository },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and emit comment.created event', async () => {
      taskRepository.find.mockResolvedValue([{ id: 10 } as Task]);
      commentRepository.create.mockReturnValue(mockComment);
      commentRepository.save.mockResolvedValue(mockComment);
      commentRepository.findOne.mockResolvedValue(mockComment);

      const dto: CreateCommentDto = {
        content: 'Hello',
        task_id: 10,
      } as CreateCommentDto;

      const result = await service.create(dto, 1);

      expect(result).toEqual(mockComment);
      expect(commentRepository.create).toHaveBeenCalledWith({
        ...dto,
        userId: 1,
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('comment.created', {
        comment: mockComment,
        createdBy: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return comment when found', async () => {
      commentRepository.findOne.mockResolvedValue(mockComment);

      const result = await service.findOne(1);

      expect(result).toEqual(mockComment);
    });

    it('should throw CommentNotFoundException when not found', async () => {
      commentRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        CommentNotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update comment content', async () => {
      commentRepository.findOne.mockResolvedValue(mockComment);
      commentRepository.save.mockResolvedValue({
        ...mockComment,
        content: 'Updated',
      });

      const dto: UpdateCommentDto = { content: 'Updated' } as UpdateCommentDto;
      const result = await service.update(1, dto);

      expect(result.content).toBe('Updated');
      expect(commentRepository.save).toHaveBeenCalled();
    });
  });

  describe('likeComment', () => {
    it('should increment likesCount when user likes for the first time', async () => {
      commentRepository.findOne.mockResolvedValue(mockComment);
      userRepository.findOne.mockResolvedValue({ id: 2 } as User);
      commentLikeRepository.findOne.mockResolvedValue(null);
      commentLikeRepository.create.mockReturnValue({} as CommentLike);
      commentLikeRepository.save.mockResolvedValue({} as CommentLike);

      await service.likeComment(1, 2);

      expect(commentLikeRepository.save).toHaveBeenCalled();
      expect(commentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ likesCount: 1 }),
      );
    });

    it('should not duplicate like when already liked', async () => {
      commentRepository.findOne.mockResolvedValue(mockComment);
      userRepository.findOne.mockResolvedValue({ id: 2 } as User);
      commentLikeRepository.findOne.mockResolvedValue({ id: 5 } as CommentLike);

      await service.likeComment(1, 2);

      expect(commentLikeRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('unlikeComment', () => {
    it('should decrement likesCount when user unlikes', async () => {
      const likedComment = { ...mockComment, likesCount: 1 } as Comment;
      commentRepository.findOne.mockResolvedValue(likedComment);
      userRepository.findOne.mockResolvedValue({ id: 2 } as User);
      commentLikeRepository.findOne.mockResolvedValue({ id: 5 } as CommentLike);

      await service.unlikeComment(1, 2);

      expect(commentLikeRepository.remove).toHaveBeenCalled();
      expect(commentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ likesCount: 0 }),
      );
    });
  });

  describe('create error paths', () => {
    it('should throw BadRequestException when task does not exist', async () => {
      taskRepository.find.mockResolvedValue([]);

      const dto: CreateCommentDto = {
        content: 'Hello',
        task_id: 999,
      } as CreateCommentDto;

      await expect(service.create(dto, 1)).rejects.toThrow(
        BadRequestException,
      );
      expect(commentRepository.save).not.toHaveBeenCalled();
    });

    it('should rethrow when save rejects with an Error', async () => {
      taskRepository.find.mockResolvedValue([{ id: 10 } as Task]);
      commentRepository.create.mockReturnValue(mockComment);
      commentRepository.save.mockRejectedValue(new Error('save failed'));

      const dto: CreateCommentDto = {
        content: 'Hello',
        task_id: 10,
      } as CreateCommentDto;

      await expect(service.create(dto, 1)).rejects.toThrow('save failed');
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should rethrow when save rejects with a non-Error value', async () => {
      taskRepository.find.mockResolvedValue([{ id: 10 } as Task]);
      commentRepository.create.mockReturnValue(mockComment);
      commentRepository.save.mockRejectedValue('unexpected failure');

      const dto: CreateCommentDto = {
        content: 'Hello',
        task_id: 10,
      } as CreateCommentDto;

      await expect(service.create(dto, 1)).rejects.toThrow('unexpected failure');
    });
  });

  describe('findOneWithoutLikes', () => {
    it('should return comment when found', async () => {
      commentRepository.findOne.mockResolvedValue(mockComment);

      const result = await service.findOneWithoutLikes(1);

      expect(result).toEqual(mockComment);
    });

    it('should throw CommentNotFoundException when not found', async () => {
      commentRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneWithoutLikes(999)).rejects.toThrow(
        CommentNotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove comment', async () => {
      commentRepository.findOne.mockResolvedValue(mockComment);

      await service.remove(1);

      expect(commentRepository.remove).toHaveBeenCalledWith(mockComment);
    });
  });

  describe('findByTaskId', () => {
    it('should return comments for a given task id', async () => {
      commentRepository.find.mockResolvedValue([mockComment]);

      const result = await service.findByTaskId(10);

      expect(result).toEqual([mockComment]);
      expect(commentRepository.find).toHaveBeenCalledWith({
        where: { task: { id: 10 } },
        relations: ['user', 'task', 'likes'],
      });
    });
  });

  describe('likeComment error paths', () => {
    it('should throw UserNotFoundException when user does not exist', async () => {
      commentRepository.findOne.mockResolvedValue(mockComment);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.likeComment(1, 999)).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('unlikeComment error paths', () => {
    it('should not decrement when user has not liked the comment', async () => {
      const likedComment = { ...mockComment, likesCount: 1 } as Comment;
      commentRepository.findOne.mockResolvedValue(likedComment);
      userRepository.findOne.mockResolvedValue({ id: 2 } as User);
      commentLikeRepository.findOne.mockResolvedValue(null);

      await service.unlikeComment(1, 2);

      expect(commentLikeRepository.remove).not.toHaveBeenCalled();
      expect(commentRepository.save).not.toHaveBeenCalled();
    });

    it('should throw UserNotFoundException when user does not exist', async () => {
      commentRepository.findOne.mockResolvedValue(mockComment);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.unlikeComment(1, 999)).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });
});
