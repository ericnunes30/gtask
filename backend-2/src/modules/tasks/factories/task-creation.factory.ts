import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { CreateTaskDto } from '../dto/create-task.dto';

export interface TaskCreationStrategy {
  canHandle(dto: CreateTaskDto): boolean;
  create(dto: CreateTaskDto, repository: Repository<Task>): Task;
}

@Injectable()
export class DefaultTaskCreationStrategy implements TaskCreationStrategy {
  canHandle(): boolean {
    return true; // fallback strategy
  }

  create(dto: CreateTaskDto, repository: Repository<Task>): Task {
    const task = repository.create(dto);
    this.applyDefaultTimer(task, dto);
    return task;
  }

  private applyDefaultTimer(task: Task, dto: CreateTaskDto): void {
    if (task.timer == null) {
      (task as any).timer = dto.timer ?? 0;
    }
  }
}

@Injectable()
export class TaskCreationFactory {
  private readonly strategies: TaskCreationStrategy[];

  constructor() {
    this.strategies = [
      new DefaultTaskCreationStrategy(),
      // Novas strategies podem ser adicionadas aqui sem modificar código existente
    ];
  }

  createTask(dto: CreateTaskDto, repository: Repository<Task>): Task {
    const strategy = this.strategies.find(s => s.canHandle(dto));
    
    if (!strategy) {
      throw new Error(`No creation strategy found for task: ${dto.title}`);
    }
    
    return strategy.create(dto, repository);
  }
}