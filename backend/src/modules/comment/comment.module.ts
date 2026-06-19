import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { CommentLike } from './entities/comment-like.entity';
import { CommentService } from './services/comment.service';
import { CommentController } from './controllers/comment.controller';
import { UserModule } from '../user/user.module';
import { CommentCreator } from './services/comment-creator.abstract';
import { CommentCreationDecorator } from './decorators/comment-creation.decorator';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, CommentLike]),
    UserModule
  ],
  controllers: [CommentController],
  providers: [
    CommentService,
    {
      provide: CommentCreator,
      useClass: CommentCreationDecorator,
    },
  ],
  exports: [CommentService, CommentCreator]
})
export class CommentModule {}
