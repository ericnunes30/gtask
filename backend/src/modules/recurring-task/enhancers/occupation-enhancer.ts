import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringTask } from '../entities/recurring-task.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';

/**
 * Popula a propriedade `occupations` a partir dos IDs armazenados em
 * `templateData.occupation_ids`. Mantido como classe injetavel para facilitar
 * testes unitarios; pode virar helper no service se novos enhancers nao surgirem.
 */
@Injectable()
export class OccupationEnhancer {
  constructor(
    @InjectRepository(Occupation)
    private occupationRepository: Repository<Occupation>,
  ) {}

  async enhance(task: RecurringTask): Promise<RecurringTask> {
    if (
      task.templateData.occupation_ids &&
      task.templateData.occupation_ids.length > 0
    ) {
      // eslint-disable-next-line sonarjs/deprecation
      const occupations = await this.occupationRepository.findByIds(
        task.templateData.occupation_ids,
      );
      task.templateData.occupations = occupations;
    }
    return task;
  }

  async enhanceMany(tasks: RecurringTask[]): Promise<RecurringTask[]> {
    return Promise.all(tasks.map((task) => this.enhance(task)));
  }
}
