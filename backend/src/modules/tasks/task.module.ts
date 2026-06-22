import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Task } from './entities/task.entity';
import { User } from '../user/entities/user.entity';
import { Occupation } from '../occupation/entities/occupation.entity';
import { TaskController } from './controllers/task.controller';
import { TaskService } from './services/task.service';
import { TimerService } from './services/timer.service';
import { ActiveProjectFindAllStrategy } from './strategies/active-project-find-all.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([Task, User, Occupation])],
  controllers: [TaskController],
  providers: [TaskService, TimerService, ActiveProjectFindAllStrategy],
  exports: [TaskService, TimerService, TypeOrmModule],
})
export class TaskModule {}
