import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';

export interface TaskFindAllStrategy {
  canHandle(repository: any): boolean;
  execute(repository: Repository<Task>): Promise<Task[]>;
}

@Injectable()
export class RepositoryFindAllStrategy implements TaskFindAllStrategy {
  canHandle(repository: any): boolean {
    return typeof repository.findAll === 'function';
  }

  async execute(repository: Repository<Task>): Promise<Task[]> {
    return await (repository as any).findAll();
  }
}

@Injectable()
export class StandardFindAllStrategy implements TaskFindAllStrategy {
  canHandle(): boolean {
    return true; // fallback strategy
  }

  async execute(repository: Repository<Task>): Promise<Task[]> {
    return await repository.find({
      relations: ['project', 'reviewer', 'users', 'occupations'],
    });
  }
}
