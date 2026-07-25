import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Task } from '../entities/task.entity';
import { User } from '../../user/entities/user.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { Status } from '../entities/enums';
import { ActiveProjectFindAllStrategy } from '../strategies/active-project-find-all.strategy';
import { TaskCommentsHelper } from '../helpers/task-comments.helper';
import { TaskNotFoundException } from '../exceptions/task-not-found.exception';
import { RelatedUsersNotFoundException } from '../exceptions/related-users-not-found.exception';
import { RelatedOccupationsNotFoundException } from '../exceptions/related-occupations-not-found.exception';
import { validateEntityIds } from '../../exception/helpers/validate-entity-ids.helper';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Occupation)
    private occupationRepository: Repository<Occupation>,
    private activeProjectFindAllStrategy: ActiveProjectFindAllStrategy,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
    const { users, occupations, ...taskData } = createTaskDto;

    const task = this.taskRepository.create({
      ...taskData,
      timer: taskData.timer ?? 0,
    });
    const savedTask = await this.taskRepository.save(task);

    if (users && users.length > 0) {
      savedTask.users = await validateEntityIds(
        this.userRepository,
        users,
        (missing) => new RelatedUsersNotFoundException(missing),
      );
    }

    if (occupations && occupations.length > 0) {
      savedTask.occupations = await validateEntityIds(
        this.occupationRepository,
        occupations,
        (missing) => new RelatedOccupationsNotFoundException(missing),
      );
    }

    const taskWithRelations =
      (users && users.length > 0) || (occupations && occupations.length > 0)
        ? await this.taskRepository.save(savedTask)
        : savedTask;

    this.eventEmitter.emit('task.created', {
      task: taskWithRelations,
      createdBy: userId,
    });
    return taskWithRelations;
  }

  async findAll(): Promise<Task[]> {
    this.logger.log('findAll called - usando ActiveProjectFindAllStrategy');
    const result = await this.activeProjectFindAllStrategy.execute(
      this.taskRepository,
    );
    this.logger.log(`Found ${result.length} tasks`);
    return result;
  }

  async findOne(id: number): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['users', 'occupations', 'project', 'reviewer'],
    });

    if (!task) {
      throw new TaskNotFoundException(id);
    }

    const comments = await TaskCommentsHelper.fetchNestedComments(
      this.taskRepository.manager.connection,
      id,
    );
    task.comments = comments;

    const activityLogs = await TaskCommentsHelper.fetchActivityLogs(
      this.taskRepository.manager.connection,
      id,
    );
    Object.assign(task, { activityLogs });

    return task;
  }

  async update(
    id: number,
    updateTaskDto: UpdateTaskDto,
    userId: number,
  ): Promise<Task> {
    const oldTask = await this.findOne(id);

    const updatedTask = await this.applyUpdate(id, updateTaskDto);
    const fullTask = await this.findOne(id);

    this.eventEmitter.emit('task.updated', {
      task: fullTask,
      updatedBy: userId,
      changedFields: this.getChangedFields(updateTaskDto, oldTask),
    });

    if (updateTaskDto.status && oldTask.status !== updateTaskDto.status) {
      this.eventEmitter.emit('task.status.changed', {
        task: fullTask,
        updatedBy: userId,
        oldStatus: oldTask.status,
        newStatus: updateTaskDto.status,
      });
    }

    if (updateTaskDto.users) {
      this.eventEmitter.emit('task.assignees.updated', {
        task: updatedTask,
        updatedBy: userId,
        action: 'set',
        userIds: updateTaskDto.users,
      });
    }

    return updatedTask;
  }

  private async applyUpdate(
    id: number,
    updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new TaskNotFoundException(id);
    }

    const {
      users: userIds,
      occupations: occupationIds,
      ...taskData
    } = updateTaskDto;

    // Se o status mudou e não foi enviado order, o backend calcula automaticamente
    if (
      taskData.status &&
      taskData.status !== task.status &&
      (taskData.order === undefined || taskData.order === null)
    ) {
      taskData.order = await this.calculateOrderForStatus(taskData.status);
    }

    Object.assign(task, taskData);

    if (userIds) {
      task.users = await validateEntityIds(
        this.taskRepository.manager.getRepository(User),
        userIds,
        (missing) => new RelatedUsersNotFoundException(missing),
      );
    }

    if (occupationIds) {
      task.occupations = await validateEntityIds(
        this.taskRepository.manager.getRepository(Occupation),
        occupationIds,
        (missing) => new RelatedOccupationsNotFoundException(missing),
      );
    }

    return await this.taskRepository.save(task);
  }

  /**
   * Calcula o order para uma tarefa ao mudar de status.
   * Coloca a tarefa no final da coluna de destino.
   * Backend é a fonte da verdade para ordenação.
   */
  private async calculateOrderForStatus(status: Status): Promise<number> {
    const tasksInColumn = await this.taskRepository.find({
      where: { status },
      order: { order: 'DESC' },
      take: 1,
    });

    if (tasksInColumn.length === 0 || tasksInColumn[0].order === null) {
      return 1;
    }

    return (tasksInColumn[0].order || 0) + 1;
  }

  private getChangedFields(
    updateTaskDto: UpdateTaskDto,
    currentTask: Task,
  ): Record<string, { oldValue: unknown; newValue: unknown }> {
    const changedFields: Record<
      string,
      { oldValue: unknown; newValue: unknown }
    > = {};

    for (const [key, newValue] of Object.entries(updateTaskDto)) {
      if (key === 'users' || key === 'occupations') continue;

      const oldValue = (currentTask as unknown as Record<string, unknown>)[key];
      if (oldValue !== newValue) {
        changedFields[key] = { oldValue, newValue };
      }
    }

    return changedFields;
  }

  async remove(id: number): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['project', 'reviewer', 'users', 'occupations'],
    });
    if (!task) {
      throw new TaskNotFoundException(id);
    }
    await this.taskRepository.remove(task);
  }

  async findByProject(projectId: number): Promise<Task[]> {
    return await this.taskRepository.find({
      where: { project_id: projectId },
      relations: ['project', 'reviewer', 'users', 'occupations'],
    });
  }

  async findByStatus(status: string): Promise<Task[]> {
    return await this.taskRepository.find({
      where: { status: status as Status },
      relations: ['project', 'reviewer', 'users', 'occupations'],
    });
  }

  async updateTimer(id: number, timerValue: number): Promise<Task> {
    const fullTask = await this.taskRepository.findOne({
      where: { id },
      relations: ['project', 'reviewer', 'users', 'occupations'],
    });

    if (!fullTask) {
      throw new TaskNotFoundException(id);
    }

    fullTask.timer = timerValue;
    return await this.taskRepository.save(fullTask);
  }

  async assignUsers(taskId: number, userIds: number[]): Promise<Task> {
    const task = await this.loadTaskOr404(taskId);
    task.users = await validateEntityIds(
      this.userRepository,
      userIds,
      (missing) => new RelatedUsersNotFoundException(missing),
    );
    await this.taskRepository.save(task);
    return await this.loadTaskOr404(taskId);
  }

  private async loadTaskOr404(taskId: number): Promise<Task> {
    const t = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project', 'reviewer', 'users', 'occupations'],
    });
    if (!t) throw new TaskNotFoundException(taskId);
    return t;
  }
}
