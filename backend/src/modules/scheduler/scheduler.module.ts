
import { Module } from '@nestjs/common';
import { TaskSchedulerService } from './scheduler.service';
import { RecurringTaskModule } from '../recurring-task/recurring-task.module';
import { TaskModule } from '../tasks/task.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskLock } from './entities/task-lock.entity';
import { LockService } from './services/lock.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskLock]),
    RecurringTaskModule,
    TaskModule,
  ],
  providers: [TaskSchedulerService, LockService],
  exports: [TaskSchedulerService],
})
export class SchedulerModule {}
