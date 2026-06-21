import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskUpdater } from '../services/task-updater.abstract';
import { TaskService } from '../services/task.service';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { Task } from '../entities/task.entity';

@Injectable()
export class TaskUpdateNotifierDecorator extends TaskUpdater {
  constructor(
    private readonly taskService: TaskService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async update(
    id: number,
    updateTaskDto: UpdateTaskDto,
    userId: number,
  ): Promise<Task> {
    const oldTask = await this.taskService.findOne(id);
    const updatedTask = await this.taskService.update(
      id,
      updateTaskDto,
      userId,
    );
    const fullTask = await this.taskService.findOne(id);

    this.eventEmitter.emit('task.updated', {
      task: fullTask,
      updatedBy: userId,
      changedFields: this.getChangedFields(updateTaskDto, oldTask),
    });

    if (updateTaskDto.status && oldTask.status !== updateTaskDto.status) {
      this.eventEmitter.emit('task.status.changed', {
        task: fullTask,
        updatedBy: userId,
        oldStatus: oldTask.status,
        newStatus: updateTaskDto.status,
      });
    }

    if (updateTaskDto.users) {
      this.eventEmitter.emit('task.assignees.updated', {
        task: updatedTask,
        updatedBy: userId,
        action: 'set',
        userIds: updateTaskDto.users,
      });
    }

    return updatedTask;
  }

  private getChangedFields(
    updateTaskDto: UpdateTaskDto,
    currentTask: Task,
  ): Record<string, { oldValue: unknown; newValue: unknown }> {
    const changedFields: Record<
      string,
      { oldValue: unknown; newValue: unknown }
    > = {};

    for (const [key, newValue] of Object.entries(updateTaskDto)) {
      if (key === 'users' || key === 'occupations') continue; // Skip relations

      const oldValue = (currentTask as unknown as Record<string, unknown>)[key];
      if (oldValue !== newValue) {
        changedFields[key] = { oldValue, newValue };
      }
    }

    return changedFields;
  }
}
