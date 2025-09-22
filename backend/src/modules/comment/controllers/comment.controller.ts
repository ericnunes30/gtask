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
import { CommentCreator } from '../services/comment-creator.abstract';

@Controller('comments')
export class CommentController {
  private readonly logger = new Logger(CommentController.name);

  constructor(
    private readonly commentService: CommentService,
    private readonly commentCreator: CommentCreator,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createCommentDto: CreateCommentDto, @Request() req) {
    this.logger.log(`[POST /comments] Received request from User #${req.user.sub}`);
    this.logger.log(`[POST /comments] DTO: ${JSON.stringify(createCommentDto)}`);
    return this.commentCreator.create(createCommentDto, req.user.sub);
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
  @UseGuards(JwtAuthGuard)
  likeComment(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.commentService.likeComment(id, req.user.sub);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  unlikeComment(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.commentService.unlikeComment(id, req.user.sub);
  }
}