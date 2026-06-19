import { UpdateTaskDto } from '../dto/update-task.dto';
import { Task } from '../entities/task.entity';

export abstract class TaskUpdater {
  abstract update(
    id: number,
    updateTaskDto: UpdateTaskDto,
    userId: number,
  ): Promise<Task>;
}
