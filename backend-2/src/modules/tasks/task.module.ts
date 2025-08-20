import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Task } from './entities/task.entity';
import { TaskController } from './controllers/task.controller';
import { TaskService } from './services/task.service';
import { TaskStrategyFactory } from './strategies/task-strategy.factory';
import { TaskCreationFactory } from './factories/task-creation.factory';

@Module({
  imports: [TypeOrmModule.forFeature([Task])],
  controllers: [TaskController],
  providers: [TaskService, TaskStrategyFactory, TaskCreationFactory],
  exports: [TaskService, TypeOrmModule],
})
export class TaskModule {}