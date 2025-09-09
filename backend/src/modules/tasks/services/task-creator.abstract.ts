import { CreateTaskDto } from '../dto/create-task.dto';
import { Task } from '../entities/task.entity';

export abstract class TaskCreator {
  abstract create(createTaskDto: CreateTaskDto, userId: number): Promise<Task>;
}
