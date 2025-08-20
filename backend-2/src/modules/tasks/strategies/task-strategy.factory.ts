import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { 
  TaskUpdateStrategy,
  RepositoryUpdateStrategy,
  EntityUpdateStrategy 
} from './task-update.strategy';
import { 
  TaskTimerUpdateStrategy,
  RepositoryTimerUpdateStrategy,
  EntityTimerUpdateStrategy 
} from './task-timer-update.strategy';
import { 
  TaskFindAllStrategy,
  RepositoryFindAllStrategy,
  StandardFindAllStrategy 
} from './task-find-all.strategy';

@Injectable()
export class TaskStrategyFactory {
  private readonly updateStrategies: TaskUpdateStrategy[];
  private readonly timerUpdateStrategies: TaskTimerUpdateStrategy[];
  private readonly findAllStrategies: TaskFindAllStrategy[];

  constructor() {
    this.updateStrategies = [
      new RepositoryUpdateStrategy(),
      new EntityUpdateStrategy(),
    ];

    this.timerUpdateStrategies = [
      new RepositoryTimerUpdateStrategy(),
      new EntityTimerUpdateStrategy(),
    ];

    this.findAllStrategies = [
      new RepositoryFindAllStrategy(),
      new StandardFindAllStrategy(),
    ];
  }

  getUpdateStrategy(repository: Repository<Task>): TaskUpdateStrategy {
    return this.updateStrategies.find(s => s.canHandle(repository)) || this.updateStrategies[1];
  }

  getTimerUpdateStrategy(repository: Repository<Task>): TaskTimerUpdateStrategy {
    return this.timerUpdateStrategies.find(s => s.canHandle(repository)) || this.timerUpdateStrategies[1];
  }

  getFindAllStrategy(repository: Repository<Task>): TaskFindAllStrategy {
    return this.findAllStrategies.find(s => s.canHandle(repository)) || this.findAllStrategies[1];
  }
}