import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RecurringTask } from '../entities/recurring-task.entity';
import { CreateRecurringTaskDto } from '../dto/create-recurring-task.dto';

export interface RecurringTaskCreationStrategy {
  canHandle(dto: CreateRecurringTaskDto): boolean;
  create(
    dto: CreateRecurringTaskDto,
    repository: Repository<RecurringTask>,
    userId: number,
  ): RecurringTask;
}

@Injectable()
export class DefaultRecurringTaskCreationStrategy
  implements RecurringTaskCreationStrategy
{
  private readonly logger = new Logger(
    DefaultRecurringTaskCreationStrategy.name,
  );

  canHandle(): boolean {
    return true; // fallback strategy
  }

  create(
    dto: CreateRecurringTaskDto,
    repository: Repository<RecurringTask>,
    userId: number,
  ): RecurringTask {
    this.logger.log('Iniciando estratégia de criação padrão.');
    const entityToCreate = {
      name: dto.name,
      templateData: this.buildTemplateData(dto),
      next_due_date: this.buildNextDueDate(dto),
      is_active: this.buildIsActive(dto),
      schedule_type: dto.schedule_type,
      frequency_interval: dto.frequency_interval,
      frequency_cron: dto.frequency_cron,
      userId: userId, // Usando o userId do usuário autenticado
      projectId: dto.projectId,
    };

    this.logger.log(
      `Dados prontos para criar a entidade: ${JSON.stringify(entityToCreate)}`,
    );

    try {
      const recurringTaskEntity = repository.create(entityToCreate);
      this.logger.log(
        'Entidade TypeORM criada com sucesso via repository.create().',
      );
      return recurringTaskEntity;
    } catch (error: unknown) {
      this.logger.error(
        'Erro ao executar repository.create()',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
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

  createRecurringTask(
    dto: CreateRecurringTaskDto,
    repository: Repository<RecurringTask>,
    userId: number,
  ): RecurringTask {
    const strategy = this.strategies.find((s) => s.canHandle(dto));

    if (!strategy) {
      throw new Error(
        `No creation strategy found for recurring task: ${dto.name}`,
      );
    }

    return strategy.create(dto, repository, userId);
  }
}
