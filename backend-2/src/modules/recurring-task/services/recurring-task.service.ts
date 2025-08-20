import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringTask } from '../entities/recurring-task.entity';
import { CreateRecurringTaskDto } from '../dto/create-recurring-task.dto';
import { UpdateRecurringTaskDto } from '../dto/update-recurring-task.dto';
import { OccupationEnhancer } from '../enhancers/occupation-enhancer';
import { RecurringTaskCreationFactory } from '../factories/recurring-task-creation.factory';
import { RecurringTaskUpdateFactory } from '../factories/recurring-task-update.factory';

@Injectable()
export class RecurringTaskService {
  constructor(
    @InjectRepository(RecurringTask)
    private recurringTaskRepository: Repository<RecurringTask>,
    private occupationEnhancer: OccupationEnhancer,
    private creationFactory: RecurringTaskCreationFactory,
    private updateFactory: RecurringTaskUpdateFactory,
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

  async create(createRecurringTaskDto: CreateRecurringTaskDto): Promise<RecurringTask> {
    const recurringTask = this.creationFactory.createRecurringTask(
      createRecurringTaskDto, 
      this.recurringTaskRepository
    );

    const savedTask = await this.recurringTaskRepository.save(recurringTask);
    return await this.occupationEnhancer.enhance(savedTask);
  }

  async update(
    id: number,
    updateRecurringTaskDto: UpdateRecurringTaskDto,
  ): Promise<RecurringTask> {
    const recurringTask = await this.findOne(id);
    
    const updatedTask = this.updateFactory.updateRecurringTask(recurringTask, updateRecurringTaskDto);
    const savedTask = await this.recurringTaskRepository.save(updatedTask);
    return await this.occupationEnhancer.enhance(savedTask);
  }

  async remove(id: number): Promise<void> {
    const recurringTask = await this.findOne(id);
    await this.recurringTaskRepository.remove(recurringTask);
  }
}