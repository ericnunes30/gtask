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
  RepositoryFindAllStrategy
} from './task-find-all.strategy';
import { ActiveProjectFindAllStrategy } from './active-project-find-all.strategy';

@Injectable()
export class TaskStrategyFactory {
  private readonly updateStrategies: TaskUpdateStrategy[];
  private readonly timerUpdateStrategies: TaskTimerUpdateStrategy[];
  private readonly findAllStrategies: TaskFindAllStrategy[];

  constructor() {
    this.updateStrategies = [
      new EntityUpdateStrategy(),
    ];

    this.timerUpdateStrategies = [
      new RepositoryTimerUpdateStrategy(),
      new EntityTimerUpdateStrategy(),
    ];

    this.findAllStrategies = [
      new RepositoryFindAllStrategy(),
      new ActiveProjectFindAllStrategy(), // Nova estratégia como padrão
    ];
  }

  getUpdateStrategy(repository: Repository<Task>): TaskUpdateStrategy {
    return this.updateStrategies[0];
  }

  getTimerUpdateStrategy(repository: Repository<Task>): TaskTimerUpdateStrategy {
    return this.timerUpdateStrategies.find(s => s.canHandle(repository)) || this.timerUpdateStrategies[1];
  }

  getFindAllStrategy(repository: Repository<Task>): TaskFindAllStrategy {
    return this.findAllStrategies.find(s => s.canHandle(repository)) || this.findAllStrategies[1];
  }
}