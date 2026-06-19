import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringTask } from '../entities/recurring-task.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { RecurringTaskEnhancer } from './recurring-task-enhancer.interface';

@Injectable()
export class OccupationEnhancer implements RecurringTaskEnhancer {
  constructor(
    @InjectRepository(Occupation)
    private occupationRepository: Repository<Occupation>,
  ) {}

  async enhance(task: RecurringTask): Promise<RecurringTask> {
    if (
      task.templateData.occupation_ids &&
      task.templateData.occupation_ids.length > 0
    ) {
      const occupations = await this.occupationRepository.findByIds(
        task.templateData.occupation_ids,
      );
      (task.templateData as any).occupations = occupations;
    }
    return task;
  }

  async enhanceMany(tasks: RecurringTask[]): Promise<RecurringTask[]> {
    return Promise.all(tasks.map((task) => this.enhance(task)));
  }
}
