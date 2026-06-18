import { CreateCommentDto } from '../dto/create-comment.dto';
import { Comment } from '../entities/comment.entity';

export abstract class CommentCreator {
  abstract create(createCommentDto: CreateCommentDto, userId: number): Promise<Comment>;
}
