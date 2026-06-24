import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Task } from '../entities/task.entity';
import { User } from '../../user/entities/user.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { Status } from '../entities/enums';
import { ActiveProjectFindAllStrategy } from '../strategies/active-project-find-all.strategy';
import { TaskCommentsHelper } from '../helpers/task-comments.helper';

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
      const userEntities = await this.userRepository.find({
        where: { id: In(users) },
      });
      savedTask.users = userEntities;
    }

    if (occupations && occupations.length > 0) {
      const occupationEntities = await this.occupationRepository.find({
        where: { id: In(occupations) },
      });
      savedTask.occupations = occupationEntities;
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
      throw new NotFoundException(`Task with ID ${id} not found`);
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
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    const {
      users: userIds,
      occupations: occupationIds,
      ...taskData
    } = updateTaskDto;

    Object.assign(task, taskData);

    if (userIds) {
      task.users = await this.taskRepository.manager.find(User, {
        where: { id: In(userIds) },
      });
    }

    if (occupationIds) {
      task.occupations = await this.taskRepository.manager.find(Occupation, {
        where: { id: In(occupationIds) },
      });
    }

    return await this.taskRepository.save(task);
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
      throw new NotFoundException(`Task with ID ${id} not found`);
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
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    fullTask.timer = timerValue;
    return await this.taskRepository.save(fullTask);
  }

  async assignUsers(taskId: number, userIds: number[]): Promise<Task> {
    const task = await this.loadTaskOr404(taskId);
    task.users = userIds.map(
      (id) => ({ id }) as unknown as (typeof task.users)[number],
    );
    await this.taskRepository.update(taskId, {
      users: userIds.map((id) => ({ id })),
    } as unknown as Parameters<Repository<Task>['update']>[1]);
    return await this.loadTaskOr404(taskId);
  }

  private async loadTaskOr404(taskId: number): Promise<Task> {
    const t = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project', 'reviewer', 'users', 'occupations'],
    });
    if (!t) throw new NotFoundException(`Task with ID ${taskId} not found`);
    return t;
  }
}
