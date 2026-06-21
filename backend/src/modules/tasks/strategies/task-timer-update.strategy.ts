import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';

export interface TaskTimerUpdateStrategy {
  canHandle(repository: Repository<Task>): boolean;
  execute(
    id: number,
    timerValue: number,
    repository: Repository<Task>,
  ): Promise<Task>;
}

@Injectable()
export class RepositoryTimerUpdateStrategy implements TaskTimerUpdateStrategy {
  canHandle(repository: Repository<Task>): boolean {
    return typeof repository.update === 'function';
  }

  async execute(
    id: number,
    timerValue: number,
    repository: Repository<Task>,
  ): Promise<Task> {
    const existenceCheck = await repository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!existenceCheck) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    await repository.update(id, { timer: timerValue });

    const updated = await repository.findOne({
      where: { id },
      relations: ['project', 'reviewer', 'users', 'occupations'],
    });
    if (!updated) {
      throw new NotFoundException(`Task with ID ${id} not found after update`);
    }
    return updated;
  }
}

@Injectable()
export class EntityTimerUpdateStrategy implements TaskTimerUpdateStrategy {
  canHandle(): boolean {
    return true; // fallback strategy
  }

  async execute(
    id: number,
    timerValue: number,
    repository: Repository<Task>,
  ): Promise<Task> {
    const fullTask = await repository.findOne({
      where: { id },
      relations: ['project', 'reviewer', 'users', 'occupations'],
    });

    if (!fullTask) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    fullTask.timer = timerValue;
    return await repository.save(fullTask);
  }
}
