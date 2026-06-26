import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { CommentService } from '../services/comment.service';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentController {
  private readonly logger = new Logger(CommentController.name);

  constructor(private readonly commentService: CommentService) {}

  @Post()
  create(
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() currentUser: Express.User,
  ) {
    this.logger.log(
      `[POST /comments] Received request from User #${currentUser.sub}`,
    );
    this.logger.log(
      `[POST /comments] DTO: ${JSON.stringify(createCommentDto)}`,
    );
    return this.commentService.create(createCommentDto, currentUser.sub);
  }

  @Get()
  findAll(@Query('task') taskId?: string) {
    if (taskId) {
      return this.commentService.findByTaskId(+taskId);
    }
    return this.commentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.commentService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentService.update(id, updateCommentDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.commentService.remove(id);
  }

  @Post(':id/like')
  likeComment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: Express.User,
  ) {
    return this.commentService.likeComment(id, currentUser.sub);
  }

  @Delete(':id/like')
  unlikeComment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: Express.User,
  ) {
    return this.commentService.unlikeComment(id, currentUser.sub);
  }
}
