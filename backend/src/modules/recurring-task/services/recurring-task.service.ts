import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringTask } from '../entities/recurring-task.entity';
import { CreateRecurringTaskDto } from '../dto/create-recurring-task.dto';
import { UpdateRecurringTaskDto } from '../dto/update-recurring-task.dto';
import { OccupationEnhancer } from '../enhancers/occupation-enhancer';

@Injectable()
export class RecurringTaskService {
  private readonly logger = new Logger(RecurringTaskService.name);

  constructor(
    @InjectRepository(RecurringTask)
    private recurringTaskRepository: Repository<RecurringTask>,
    private occupationEnhancer: OccupationEnhancer,
  ) {}

  async findAll(): Promise<RecurringTask[]> {
    const recurringTasks = await this.recurringTaskRepository.find({
      relations: ['user', 'project'],
    });

    return await this.occupationEnhancer.enhanceMany(recurringTasks);
  }

  async findOne(id: number): Promise<RecurringTask> {
    const recurringTask = await this.recurringTaskRepository.findOne({
      where: { id },
      relations: ['user', 'project'],
    });

    if (!recurringTask) {
      throw new NotFoundException(`RecurringTask with ID ${id} not found`);
    }

    return await this.occupationEnhancer.enhance(recurringTask);
  }

  async create(
    createRecurringTaskDto: CreateRecurringTaskDto,
    userId: number,
  ): Promise<RecurringTask> {
    this.logger.log(
      `Iniciando criação de tarefa recorrente para o usuário ${userId} com dados: ${JSON.stringify(createRecurringTaskDto)}`,
    );
    try {
      const recurringTask = this.buildRecurringTask(
        createRecurringTaskDto,
        userId,
      );
      this.logger.log(`Entidade construida: ${JSON.stringify(recurringTask)}`);

      const savedTask = await this.recurringTaskRepository.save(recurringTask);
      this.logger.log(`Tarefa salva no banco de dados com ID: ${savedTask.id}`);

      const enhancedTask = await this.occupationEnhancer.enhance(savedTask);
      this.logger.log('Tarefa "melhorada" com sucesso.');
      return enhancedTask;
    } catch (error: unknown) {
      this.logger.error(
        'Erro capturado no RecurringTaskService',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private buildRecurringTask(
    dto: CreateRecurringTaskDto,
    userId: number,
  ): RecurringTask {
    return this.recurringTaskRepository.create({
      name: dto.name,
      templateData: {
        ...dto.templateData,
        occupation_ids: dto.templateData.occupation_ids,
      },
      next_due_date: dto.next_due_date
        ? new Date(dto.next_due_date)
        : new Date(),
      is_active: dto.is_active ?? true,
      schedule_type: dto.schedule_type,
      frequency_interval: dto.frequency_interval ?? null,
      frequency_cron: dto.frequency_cron ?? null,
      userId,
      projectId: dto.projectId,
    });
  }

  async update(
    id: number,
    updateRecurringTaskDto: UpdateRecurringTaskDto,
  ): Promise<RecurringTask> {
    const recurringTask = await this.findOne(id);

    this.applyUpdate(recurringTask, updateRecurringTaskDto);

    const savedTask = await this.recurringTaskRepository.save(recurringTask);
    return await this.occupationEnhancer.enhance(savedTask);
  }

  private applyUpdate(task: RecurringTask, dto: UpdateRecurringTaskDto): void {
    if (dto.next_due_date) {
      task.next_due_date = new Date(dto.next_due_date);
    }

    if (dto.templateData) {
      task.templateData = {
        ...task.templateData,
        ...dto.templateData,
        occupation_ids:
          dto.templateData.occupation_ids || task.templateData.occupation_ids,
      };
    }

    if (dto.is_active !== null && dto.is_active !== undefined) {
      task.is_active = dto.is_active;
    }

    Object.assign(task, {
      name: dto.name || task.name,
      schedule_type: dto.schedule_type || task.schedule_type,
      frequency_interval: dto.frequency_interval || task.frequency_interval,
      frequency_cron: dto.frequency_cron || task.frequency_cron,
      userId: dto.userId || task.userId,
      projectId: dto.projectId || task.projectId,
    });
  }

  async remove(id: number): Promise<void> {
    const recurringTask = await this.findOne(id);
    await this.recurringTaskRepository.remove(recurringTask);
  }
}
