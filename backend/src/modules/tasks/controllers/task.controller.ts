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
  Request,
} from '@nestjs/common';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskCreator } from '../services/task-creator.abstract';
import { TaskUpdater } from '../services/task-updater.abstract';
import { TaskService } from '../services/task.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('tasks')
export class TaskController {
  private readonly logger = new Logger(TaskController.name);
  constructor(
    private readonly taskService: TaskService,
    private readonly taskCreator: TaskCreator,
    private readonly taskUpdater: TaskUpdater,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    // Passamos o ID do usuário autenticado para a camada de criação
    return this.taskCreator.create(createTaskDto, req.user.sub);
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
  findOne(@Param('id') id: string) {
    return this.taskService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req,
  ) {
    return this.taskUpdater.update(+id, updateTaskDto, req.user.sub);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  async patch(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req,
  ) {
    this.logger.log(`[PATCH /tasks/:id] Received request for task ID: ${id}`);
    this.logger.log(
      `[PATCH /tasks/:id] Request body: ${JSON.stringify(updateTaskDto)}`,
    );
    try {
      const updatedTask = await this.taskUpdater.update(
        +id,
        updateTaskDto,
        req.user.sub,
      );
      this.logger.log(`[PATCH /tasks/:id] Task ID ${id} updated successfully.`);
      return updatedTask;
    } catch (error) {
      this.logger.error(
        `[PATCH /tasks/:id] Error updating task ID ${id}: ${error.message}`,
      );
      throw error; // Re-throw the error so NestJS can handle it
    }
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taskService.remove(+id);
  }

  @Patch(':id/timer')
  updateTimer(@Param('id') id: string, @Body('timer') timer: number) {
    return this.taskService.updateTimer(+id, timer);
  }

  @Post(':id/assign-users')
  assignUsers(@Param('id') id: string, @Body('userIds') userIds: number[]) {
    return this.taskService.assignUsers(+id, userIds);
  }
}
