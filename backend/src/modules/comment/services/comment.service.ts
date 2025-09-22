import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { CommentLike } from '../entities/comment-like.entity';
import { User } from '../../user/entities/user.entity';
import { CommentCreator } from './comment-creator.abstract';

@Injectable()
export class CommentService extends CommentCreator {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(CommentLike)
    private commentLikeRepository: Repository<CommentLike>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super();
  }

  async create(createCommentDto: CreateCommentDto, userId: number): Promise<Comment> {
    this.logger.log(`Service: Creating comment for user #${userId} with DTO: ${JSON.stringify(createCommentDto)}`);
    const commentEntity = this.commentRepository.create({ ...createCommentDto, userId });
    this.logger.log(`Service: Comment entity created, attempting to save...`);
    try {
      const savedComment = await this.commentRepository.save(commentEntity);
      this.logger.log(`Service: Comment #${savedComment.id} saved successfully. Refetching with relations...`);
      // Re-fetch the comment to include all relations and DB-generated values
      return this.findOne(savedComment.id);
    } catch (error) {
      this.logger.error(`Service: Failed to save comment.`, error.stack);
      throw error;
    }
  }

async findAll(): Promise<Comment[]> {
    return this.commentRepository.find({
      relations: ['user', 'task', 'task.users', 'task.project', 'task.project.users', 'likes'],
    });
  }

  async findOne(id: number): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['user', 'task', 'task.users', 'task.project', 'task.project.users', 'likes'],
    });

    if (!comment) {
      throw new NotFoundException(`Comentário com ID ${id} não encontrado`);
    }

    return comment;
  }

  async findOneWithoutLikes(id: number): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['user', 'task', 'task.users', 'task.project', 'task.project.users'],
    });

    if (!comment) {
      throw new NotFoundException(`Comentário com ID ${id} não encontrado`);
    }

    return comment;
  }

  async update(id: number, updateCommentDto: UpdateCommentDto): Promise<Comment> {
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

  async likeComment(commentId: number, userId: number): Promise<void> {
    const comment = await this.findOneWithoutLikes(commentId);
    
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }
    
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const existingLike = await this.commentLikeRepository.findOne({
      where: { commentId, userId },
    });

    if (existingLike) {
      return; // Already liked
    }

    const commentLike = this.commentLikeRepository.create({ commentId, userId });
    await this.commentLikeRepository.save(commentLike);

    comment.likesCount++;
    await this.commentRepository.save(comment);
  }

  async unlikeComment(commentId: number, userId: number): Promise<void> {
    const comment = await this.findOneWithoutLikes(commentId);
    
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }
    
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

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
