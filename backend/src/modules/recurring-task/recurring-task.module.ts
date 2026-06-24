import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecurringTask } from './entities/recurring-task.entity';
import { RecurringTaskController } from './controllers/recurring-task.controller';
import { RecurringTaskService } from './services/recurring-task.service';
import { Occupation } from '../occupation/entities/occupation.entity';
import { OccupationEnhancer } from './enhancers/occupation-enhancer';

@Module({
  imports: [TypeOrmModule.forFeature([RecurringTask, Occupation])],
  controllers: [RecurringTaskController],
  providers: [RecurringTaskService, OccupationEnhancer],
  exports: [RecurringTaskService, TypeOrmModule],
})
export class RecurringTaskModule {}
