import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Comment } from '../entities/comment.entity';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { CommentLike } from '../entities/comment-like.entity';
import { User } from '../../user/entities/user.entity';
import { CommentNotFoundException } from '../exceptions/comment-not-found.exception';
import { UserNotFoundException } from '../../user/exceptions/user-not-found.exception';
import { validateEntityIds } from '../../exception/helpers/validate-entity-ids.helper';
import { Task } from '../../tasks/entities/task.entity';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(CommentLike)
    private commentLikeRepository: Repository<CommentLike>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(
    createCommentDto: CreateCommentDto,
    userId: number,
  ): Promise<Comment> {
    this.logger.log(
      `Service: Creating comment for user #${userId} with DTO: ${JSON.stringify(createCommentDto)}`,
    );
    await validateEntityIds(
      this.taskRepository,
      [createCommentDto.task_id],
      (missing) =>
        new BadRequestException(`Task with ID ${missing[0]} not found`),
    );
    const commentEntity = this.commentRepository.create({
      ...createCommentDto,
      userId,
    });
    this.logger.log(`Service: Comment entity created, attempting to save...`);
    try {
      const savedComment = await this.commentRepository.save(commentEntity);
      this.logger.log(
        `Service: Comment #${savedComment.id} saved successfully. Refetching with relations...`,
      );
      const comment = await this.findOne(savedComment.id);

      this.eventEmitter.emit('comment.created', { comment, createdBy: userId });

      return comment;
    } catch (error: unknown) {
      this.logger.error(
        `Service: Failed to save comment.`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async findAll(): Promise<Comment[]> {
    return this.commentRepository.find({
      relations: [
        'user',
        'task',
        'task.users',
        'task.project',
        'task.project.users',
        'likes',
      ],
    });
  }

  async findOne(id: number): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: [
        'user',
        'task',
        'task.users',
        'task.project',
        'task.project.users',
        'likes',
      ],
    });

    if (!comment) {
      throw new CommentNotFoundException(id);
    }

    return comment;
  }

  async findOneWithoutLikes(id: number): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: [
        'user',
        'task',
        'task.users',
        'task.project',
        'task.project.users',
      ],
    });

    if (!comment) {
      throw new CommentNotFoundException(id);
    }

    return comment;
  }

  async update(
    id: number,
    updateCommentDto: UpdateCommentDto,
  ): Promise<Comment> {
    const comment = await this.findOne(id);
    Object.assign(comment, updateCommentDto);
    return this.commentRepository.save(comment);
  }

  async remove(id: number): Promise<void> {
    const comment = await this.findOne(id);
    await this.commentRepository.remove(comment);
  }

  async findByTaskId(taskId: number): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { task: { id: taskId } },
      relations: ['user', 'task', 'likes'],
    });
  }

  private async loadCommentAndUser(
    commentId: number,
    userId: number,
  ): Promise<{ comment: Comment; user: User }> {
    const comment = await this.findOneWithoutLikes(commentId);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    return { comment, user };
  }

  async likeComment(commentId: number, userId: number): Promise<void> {
    const { comment } = await this.loadCommentAndUser(commentId, userId);

    const existingLike = await this.commentLikeRepository.findOne({
      where: { commentId, userId },
    });

    if (existingLike) {
      return; // Already liked
    }

    const commentLike = this.commentLikeRepository.create({
      commentId,
      userId,
    });
    await this.commentLikeRepository.save(commentLike);

    comment.likesCount++;
    await this.commentRepository.save(comment);
  }

  async unlikeComment(commentId: number, userId: number): Promise<void> {
    const { comment } = await this.loadCommentAndUser(commentId, userId);

    const existingLike = await this.commentLikeRepository.findOne({
      where: { commentId, userId },
    });

    if (!existingLike) {
      return; // Not liked
    }

    await this.commentLikeRepository.remove(existingLike);

    comment.likesCount--;
    await this.commentRepository.save(comment);
  }
}
