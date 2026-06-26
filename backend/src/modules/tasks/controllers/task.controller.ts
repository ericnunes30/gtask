import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  Patch,
  Logger,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskService } from '../services/task.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TaskController {
  private readonly logger = new Logger(TaskController.name);
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() currentUser: Express.User,
  ) {
    // Passamos o ID do usuário autenticado para a camada de criação
    return this.taskService.create(createTaskDto, currentUser.sub);
  }

  @Get()
  findAll(
    @Query('project') projectId?: string,
    @Query('status') status?: string,
  ) {
    if (projectId) {
      return this.taskService.findByProject(+projectId);
    }
    if (status) {
      return this.taskService.findByStatus(status);
    }
    return this.taskService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() currentUser: Express.User,
  ) {
    return this.taskService.update(id, updateTaskDto, currentUser.sub);
  }

  @Patch(':id')
  async patch(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() currentUser: Express.User,
  ) {
    this.logger.log(`[PATCH /tasks/:id] Received request for task ID: ${id}`);
    this.logger.log(
      `[PATCH /tasks/:id] Request body: ${JSON.stringify(updateTaskDto)}`,
    );
    try {
      const updatedTask = await this.taskService.update(
        id,
        updateTaskDto,
        currentUser.sub,
      );
      this.logger.log(`[PATCH /tasks/:id] Task ID ${id} updated successfully.`);
      return updatedTask;
    } catch (error: unknown) {
      this.logger.error(
        `[PATCH /tasks/:id] Error updating task ID ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error; // Re-throw the error so NestJS can handle it
    }
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.remove(id);
  }

  @Patch(':id/timer')
  updateTimer(
    @Param('id', ParseIntPipe) id: number,
    @Body('timer') timer: number,
  ) {
    return this.taskService.updateTimer(id, timer);
  }

  @Post(':id/assign-users')
  assignUsers(
    @Param('id', ParseIntPipe) id: number,
    @Body('userIds') userIds: number[],
  ) {
    return this.taskService.assignUsers(id, userIds);
  }
}
