import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { Task } from '../entities/task.entity';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { User } from '../../user/entities/user.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
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
    const existing = await repository.findOne({ 
      where: { id },
      relations: ['users', 'occupations', 'project']
    });
    if (!existing) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    await (repository as any).update(id, updateTaskDto);
    return (await (repository as any).findOne({ 
      where: { id },
      relations: ['users', 'occupations', 'project']
    })) as Task;
  }
}

@Injectable()
export class EntityUpdateStrategy implements TaskUpdateStrategy {
  canHandle(): boolean {
    return true; // fallback strategy
  }

  async execute(id: number, updateTaskDto: UpdateTaskDto, repository: Repository<Task>): Promise<Task> {
    const task = await repository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Desestruturar o DTO para separar as relações
    const { users: userIds, occupations: occupationIds, ...taskData } = updateTaskDto;

    // Atualizar os campos da tarefa
    Object.assign(task, taskData);

    // Atualizar relações (se fornecidas)
    if (userIds) {
      task.users = await repository.manager.find(User, { where: { id: In(userIds) } });
    }

    if (occupationIds) {
      task.occupations = await repository.manager.find(Occupation, { where: { id: In(occupationIds) } });
    }

    return repository.save(task);
  }
}