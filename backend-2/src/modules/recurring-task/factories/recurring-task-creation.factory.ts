import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RecurringTask } from '../entities/recurring-task.entity';
import { CreateRecurringTaskDto } from '../dto/create-recurring-task.dto';

export interface RecurringTaskCreationStrategy {
  canHandle(dto: CreateRecurringTaskDto): boolean;
  create(dto: CreateRecurringTaskDto, repository: Repository<RecurringTask>): RecurringTask;
}

@Injectable()
export class DefaultRecurringTaskCreationStrategy implements RecurringTaskCreationStrategy {
  canHandle(): boolean {
    return true; // fallback strategy
  }

  create(dto: CreateRecurringTaskDto, repository: Repository<RecurringTask>): RecurringTask {
    return repository.create({
      name: dto.name,
      templateData: this.buildTemplateData(dto),
      next_due_date: this.buildNextDueDate(dto),
      is_active: this.buildIsActive(dto),
      schedule_type: dto.schedule_type,
      frequency_interval: dto.frequency_interval,
      frequency_cron: dto.frequency_cron,
      userId: dto.userId,
      projectId: dto.projectId,
    });
  }

  private buildTemplateData(dto: CreateRecurringTaskDto): any {
    return {
      ...dto.templateData,
      occupation_ids: dto.templateData.occupation_ids,
    };
  }

  private buildNextDueDate(dto: CreateRecurringTaskDto): Date {
    return dto.next_due_date ? new Date(dto.next_due_date) : new Date();
  }

  private buildIsActive(dto: CreateRecurringTaskDto): boolean {
    return dto.is_active ?? true;
  }
}

@Injectable()
export class RecurringTaskCreationFactory {
  private readonly strategies: RecurringTaskCreationStrategy[];

  constructor() {
    this.strategies = [
      new DefaultRecurringTaskCreationStrategy(),
      // Novas strategies podem ser adicionadas aqui sem modificar código existente
    ];
  }

  createRecurringTask(dto: CreateRecurringTaskDto, repository: Repository<RecurringTask>): RecurringTask {
    const strategy = this.strategies.find(s => s.canHandle(dto));
    
    if (!strategy) {
      throw new Error(`No creation strategy found for recurring task: ${dto.name}`);
    }
    
    return strategy.create(dto, repository);
  }
}