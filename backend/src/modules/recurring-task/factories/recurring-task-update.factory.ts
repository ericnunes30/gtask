import { Injectable } from '@nestjs/common';
import { RecurringTask } from '../entities/recurring-task.entity';
import { UpdateRecurringTaskDto } from '../dto/update-recurring-task.dto';

export interface RecurringTaskUpdateStrategy {
  canHandle(dto: UpdateRecurringTaskDto): boolean;
  update(task: RecurringTask, dto: UpdateRecurringTaskDto): RecurringTask;
}

@Injectable()
export class DefaultRecurringTaskUpdateStrategy implements RecurringTaskUpdateStrategy {
  canHandle(): boolean {
    return true; // fallback strategy
  }

  update(task: RecurringTask, dto: UpdateRecurringTaskDto): RecurringTask {
    this.updateNextDueDate(task, dto);
    this.updateTemplateData(task, dto);
    this.updateBasicFields(task, dto);
    
    return task;
  }

  private updateNextDueDate(task: RecurringTask, dto: UpdateRecurringTaskDto): void {
    if (dto.next_due_date) {
      task.next_due_date = new Date(dto.next_due_date);
    }
  }

  private updateTemplateData(task: RecurringTask, dto: UpdateRecurringTaskDto): void {
    if (dto.templateData) {
      task.templateData = {
        ...task.templateData,
        ...dto.templateData,
        occupation_ids: dto.templateData.occupation_ids || task.templateData.occupation_ids,
      };
    }
  }

  private updateBasicFields(task: RecurringTask, dto: UpdateRecurringTaskDto): void {
    // Lida com is_active explicitamente para garantir a atualização
    if (dto.is_active !== null && dto.is_active !== undefined) {
      task.is_active = dto.is_active;
    }

    // Lida com outros campos básicos
    Object.assign(task, {
      name: dto.name || task.name,
      schedule_type: dto.schedule_type || task.schedule_type,
      frequency_interval: dto.frequency_interval || task.frequency_interval,
      frequency_cron: dto.frequency_cron || task.frequency_cron,
      userId: dto.userId || task.userId,
      projectId: dto.projectId || task.projectId,
    });
  }
}

@Injectable()
export class RecurringTaskUpdateFactory {
  private readonly strategies: RecurringTaskUpdateStrategy[];

  constructor() {
    this.strategies = [
      new DefaultRecurringTaskUpdateStrategy(),
      // Novas strategies podem ser adicionadas aqui sem modificar código existente
    ];
  }

  updateRecurringTask(task: RecurringTask, dto: UpdateRecurringTaskDto): RecurringTask {
    const strategy = this.strategies.find(s => s.canHandle(dto));
    
    if (!strategy) {
      throw new Error(`No update strategy found for recurring task update`);
    }
    
    return strategy.update(task, dto);
  }
}