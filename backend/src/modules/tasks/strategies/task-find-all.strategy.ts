import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';

export interface TaskFindAllStrategy {
  canHandle(repository: Repository<Task>): boolean;
  execute(repository: Repository<Task>): Promise<Task[]>;
}

@Injectable()
export class RepositoryFindAllStrategy implements TaskFindAllStrategy {
  canHandle(repository: Repository<Task>): boolean {
    return (
      typeof (repository as unknown as { findAll?: () => Promise<Task[]> })
        .findAll === 'function'
    );
  }

  async execute(repository: Repository<Task>): Promise<Task[]> {
    const customRepo = repository as unknown as {
      findAll: () => Promise<Task[]>;
    };
    return await customRepo.findAll();
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
