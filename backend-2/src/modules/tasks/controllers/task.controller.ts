import { Controller, Get, Post, Body, Param, Put, Delete, Query, Patch } from '@nestjs/common';
import { TaskService } from '../services/task.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.taskService.create(createTaskDto);
  }

  @Get()
  findAll(@Query('project') projectId?: string, @Query('status') status?: string) {
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
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.taskService.update(+id, updateTaskDto);
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