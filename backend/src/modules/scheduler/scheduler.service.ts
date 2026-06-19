import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual } from 'typeorm';
import {
  RecurringTask,
  ScheduleType,
} from '../recurring-task/entities/recurring-task.entity';
import { Task } from '../tasks/entities/task.entity';
import { Status } from '../tasks/entities/enums';
import { DateTime } from 'luxon';
import cronParser = require('cron-parser');
import { LockService } from './services/lock.service';

@Injectable()
export class TaskSchedulerService {
  private readonly logger = new Logger(TaskSchedulerService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(RecurringTask)
    private readonly recurringTaskRepository: Repository<RecurringTask>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly lockService: LockService, // Injetado
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const lockKey = 'process-recurring-tasks';
    const hasLock = await this.lockService.acquire(lockKey);

    if (!hasLock) {
      this.logger.log(
        'Skipping recurring task processing, already locked by another instance.',
      );
      return;
    }

    this.logger.log('Lock acquired, starting recurring tasks check...');

    try {
      await this.processDueRecurringTasks();
    } catch (error) {
      this.logger.error(
        'Unexpected error during recurring task processing.',
        error.stack,
      );
    } finally {
      this.logger.log('Recurring tasks check finished. Releasing lock.');
      await this.lockService.release(lockKey);
    }
  }

  private async processDueRecurringTasks() {
    const dueTasks = await this.recurringTaskRepository.find({
      where: {
        is_active: true,
        next_due_date: LessThanOrEqual(new Date()),
      },
    });

    if (dueTasks.length === 0) {
      this.logger.log('No overdue recurring tasks found.');
      return;
    }

    this.logger.log(`Found ${dueTasks.length} recurring tasks to process.`);

    for (const recurringTask of dueTasks) {
      await this.processSingleTask(recurringTask);
    }
  }

  private async processSingleTask(recurringTask: RecurringTask) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Processing recurring task #${recurringTask.id}`);
      const { templateData } = recurringTask;

      // 1. Create the new task
      const newTask = this.taskRepository.create({
        title: templateData.title,
        description: templateData.description,
        priority: templateData.priority,
        project_id: recurringTask.projectId,
        recurring_task_id: recurringTask.id,
        task_reviewer_id: templateData.task_reviewer_id,
        status: Status.ToDo,
        start_date: templateData.start_date
          ? new Date(templateData.start_date)
          : recurringTask.next_due_date,
        due_date: templateData.due_date
          ? new Date(templateData.due_date)
          : recurringTask.next_due_date,
        // Map other template fields if necessary
      });

      // Associations (example for users, requires Task entity to have the relation)
      if (templateData.assignee_ids) {
        newTask.users = templateData.assignee_ids.map((id) => ({ id }) as any);
      }

      await queryRunner.manager.save(Task, newTask);

      // 2. Calculate the next due date
      const nextDueDate = this.calculateNextDueDate(recurringTask);
      recurringTask.next_due_date = nextDueDate.toJSDate();

      await queryRunner.manager.save(RecurringTask, recurringTask);

      await queryRunner.commitTransaction();
      this.logger.log(
        `Task #${newTask.id} created successfully from recurring task #${recurringTask.id}.`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to process recurring task #${recurringTask.id}`,
        error.stack,
      );
    } finally {
      await queryRunner.release();
    }
  }

  private calculateNextDueDate(recurringTask: RecurringTask): DateTime {
    const currentBaseDate = DateTime.fromJSDate(recurringTask.next_due_date);
    let nextDueDate: DateTime;

    if (
      recurringTask.schedule_type === ScheduleType.INTERVAL &&
      recurringTask.frequency_interval
    ) {
      const [valueStr, unit] = recurringTask.frequency_interval.split(' ');
      const value = parseInt(valueStr, 10);
      const duration = { [unit]: value }; // ex: { days: 7 }
      nextDueDate = currentBaseDate.plus(duration);
    } else if (
      recurringTask.schedule_type === ScheduleType.CRON &&
      recurringTask.frequency_cron
    ) {
      try {
        const interval = (cronParser as any).parseExpression(
          recurringTask.frequency_cron,
          {
            currentDate: currentBaseDate.toJSDate(),
          },
        );
        nextDueDate = DateTime.fromJSDate(interval.next().toDate());
      } catch {
        this.logger.error(
          `Invalid CRON expression for task #${recurringTask.id}: ${recurringTask.frequency_cron}. Using 7-day fallback.`,
        );
        nextDueDate = currentBaseDate.plus({ days: 7 });
      }
    } else {
      this.logger.warn(
        `Invalid schedule type for task #${recurringTask.id}. Using 7-day fallback.`,
      );
      nextDueDate = currentBaseDate.plus({ days: 7 });
    }

    // Ensures the next date is in the future relative to now, to avoid infinite loops if the interval is too short
    if (nextDueDate <= DateTime.now()) {
      return this.calculateNextDueDate({
        ...recurringTask,
        next_due_date: nextDueDate.toJSDate(),
      });
    }

    return nextDueDate;
  }
}
