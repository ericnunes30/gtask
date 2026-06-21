import { RecurringTask } from '../entities/recurring-task.entity';

export interface RecurringTaskEnhancer {
  enhance(task: RecurringTask): Promise<RecurringTask>;
  enhanceMany(tasks: RecurringTask[]): Promise<RecurringTask[]>;
}
