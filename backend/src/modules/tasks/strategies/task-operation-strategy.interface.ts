import { Task } from '../entities/task.entity';

export interface TaskOperationStrategy {
  canHandle(repository: any): boolean;
  execute(data: any): Promise<Task | Task[] | void>;
}