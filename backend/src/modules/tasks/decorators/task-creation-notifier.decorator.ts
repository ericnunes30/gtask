import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskCreator } from '../services/task-creator.abstract';
import { TaskService } from '../services/task.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { Task } from '../entities/task.entity';

@Injectable()
export class TaskCreationNotifierDecorator extends TaskCreator {
  constructor(
    @Inject(TaskService) private readonly taskCreator: TaskCreator,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
    const task = await this.taskCreator.create(createTaskDto, userId);
    // Emitimos um payload mais rico, com a tarefa e quem a criou
    this.eventEmitter.emit('task.created', { task, createdBy: userId });
    return task;
  }
}
