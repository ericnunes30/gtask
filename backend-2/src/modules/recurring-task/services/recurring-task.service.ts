import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringTask } from '../entities/recurring-task.entity';
import { CreateRecurringTaskDto } from '../dto/create-recurring-task.dto';
import { UpdateRecurringTaskDto } from '../dto/update-recurring-task.dto';
import { Occupation } from '../../occupation/entities/occupation.entity';

@Injectable()
export class RecurringTaskService {
  constructor(
    @InjectRepository(RecurringTask)
    private recurringTaskRepository: Repository<RecurringTask>,
    @InjectRepository(Occupation)
    private occupationRepository: Repository<Occupation>,
  ) {}

  async findAll(): Promise<RecurringTask[]> {
    const recurringTasks = await this.recurringTaskRepository.find({
      relations: ['user', 'project'],
    });

    const tasksWithOccupations = await Promise.all(
      recurringTasks.map(async (task) => {
        if (
          task.templateData.occupation_ids &&
          task.templateData.occupation_ids.length > 0
        ) {
          const occupations = await this.occupationRepository.findByIds(
            task.templateData.occupation_ids
          );
          (task.templateData as any).occupations = occupations;
        }
        return task;
      })
    );

    return tasksWithOccupations;
  }

  async findOne(id: number): Promise<RecurringTask> {
    const recurringTask = await this.recurringTaskRepository.findOne({
      where: { id },
      relations: ['user', 'project'],
    });

    if (!recurringTask) {
      throw new NotFoundException(`RecurringTask with ID ${id} not found`);
    }

    if (
      recurringTask.templateData.occupation_ids &&
      recurringTask.templateData.occupation_ids.length > 0
    ) {
      const occupations = await this.occupationRepository.findByIds(
        recurringTask.templateData.occupation_ids
      );
      (recurringTask.templateData as any).occupations = occupations;
    }

    return recurringTask;
  }

  async create(createRecurringTaskDto: CreateRecurringTaskDto): Promise<RecurringTask> {
    const recurringTask = this.recurringTaskRepository.create({
      name: createRecurringTaskDto.name,
      templateData: {
        ...createRecurringTaskDto.templateData,
        occupation_ids: createRecurringTaskDto.templateData.occupation_ids,
      },
      next_due_date: createRecurringTaskDto.next_due_date
        ? new Date(createRecurringTaskDto.next_due_date)
        : new Date(),
      is_active: createRecurringTaskDto.is_active ?? true,
      schedule_type: createRecurringTaskDto.schedule_type,
      frequency_interval: createRecurringTaskDto.frequency_interval,
      frequency_cron: createRecurringTaskDto.frequency_cron,
      userId: createRecurringTaskDto.userId,
      projectId: createRecurringTaskDto.projectId,
    });

    const savedTask = await this.recurringTaskRepository.save(recurringTask);

    if (
      savedTask.templateData.occupation_ids &&
      savedTask.templateData.occupation_ids.length > 0
    ) {
      const occupations = await this.occupationRepository.findByIds(
        savedTask.templateData.occupation_ids
      );
      (savedTask.templateData as any).occupations = occupations;
    }

    return savedTask;
  }

  async update(
    id: number,
    updateRecurringTaskDto: UpdateRecurringTaskDto,
  ): Promise<RecurringTask> {
    const recurringTask = await this.findOne(id);

    if (updateRecurringTaskDto.next_due_date) {
      recurringTask.next_due_date = new Date(updateRecurringTaskDto.next_due_date);
    }

    if (updateRecurringTaskDto.templateData) {
      recurringTask.templateData = {
        ...recurringTask.templateData,
        ...updateRecurringTaskDto.templateData,
        occupation_ids:
          updateRecurringTaskDto.templateData.occupation_ids ||
          recurringTask.templateData.occupation_ids,
      };
    }

    Object.assign(recurringTask, {
      name: updateRecurringTaskDto.name || recurringTask.name,
      is_active: updateRecurringTaskDto.is_active ?? recurringTask.is_active,
      schedule_type: updateRecurringTaskDto.schedule_type || recurringTask.schedule_type,
      frequency_interval: updateRecurringTaskDto.frequency_interval || recurringTask.frequency_interval,
      frequency_cron: updateRecurringTaskDto.frequency_cron || recurringTask.frequency_cron,
      userId: updateRecurringTaskDto.userId || recurringTask.userId,
      projectId: updateRecurringTaskDto.projectId || recurringTask.projectId,
    });

    const savedTask = await this.recurringTaskRepository.save(recurringTask);

    if (
      savedTask.templateData.occupation_ids &&
      savedTask.templateData.occupation_ids.length > 0
    ) {
      const occupations = await this.occupationRepository.findByIds(
        savedTask.templateData.occupation_ids
      );
      (savedTask.templateData as any).occupations = occupations;
    }

    return savedTask;
  }

  async remove(id: number): Promise<void> {
    const recurringTask = await this.findOne(id);
    await this.recurringTaskRepository.remove(recurringTask);
  }
}