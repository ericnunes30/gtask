import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskOperationStrategy } from './task-operation-strategy.interface';

export interface TaskUpdateStrategy {
  canHandle(repository: any): boolean;
  execute(id: number, dto: UpdateTaskDto, repository: Repository<Task>): Promise<Task>;
}

@Injectable()
export class RepositoryUpdateStrategy implements TaskUpdateStrategy {
  canHandle(repository: any): boolean {
    return typeof repository.update === 'function';
  }

  async execute(id: number, updateTaskDto: UpdateTaskDto, repository: Repository<Task>): Promise<Task> {
    const existing = await repository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    await (repository as any).update(id, updateTaskDto);
    return (await (repository as any).findOne({ where: { id } })) as Task;
  }
}

@Injectable()
export class EntityUpdateStrategy implements TaskUpdateStrategy {
  canHandle(): boolean {
    return true; // fallback strategy
  }

  async execute(id: number, updateTaskDto: UpdateTaskDto, repository: Repository<Task>): Promise<Task> {
    const existing = await repository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    Object.assign(existing, updateTaskDto);
    return await repository.save(existing);
  }
}