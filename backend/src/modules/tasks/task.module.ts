import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Task } from './entities/task.entity';
import { User } from '../user/entities/user.entity';
import { Occupation } from '../occupation/entities/occupation.entity';
import { TaskController } from './controllers/task.controller';
import { TaskService } from './services/task.service';
import { TaskStrategyFactory } from './strategies/task-strategy.factory';
import { TaskCreationFactory } from './factories/task-creation.factory';
import { TaskCreator } from './services/task-creator.abstract';
import { TaskCreationNotifierDecorator } from './decorators/task-creation-notifier.decorator';
import { TaskUpdateNotifierDecorator } from './decorators/task-update-notifier.decorator';
import { TaskUpdater } from './services/task-updater.abstract';
import { TimerService } from './services/timer.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, User, Occupation])],
  controllers: [TaskController],
  providers: [
    TaskService, // Must be a provider to be injectable
    TimerService,
    TaskStrategyFactory,
    TaskCreationFactory,
    {
      provide: TaskCreator,
      useClass: TaskCreationNotifierDecorator,
    },
    {
      provide: TaskUpdater,
      useClass: TaskUpdateNotifierDecorator,
    },
  ],
  exports: [TaskService, TimerService, TypeOrmModule, TaskCreator, TaskUpdater],
})
export class TaskModule {}
