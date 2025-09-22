import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Task } from '../entities/task.entity';
import { User } from '../../user/entities/user.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskStrategyFactory } from '../strategies/task-strategy.factory';
import { TaskCreationFactory } from '../factories/task-creation.factory';
import { TaskCreator } from './task-creator.abstract';
import { TaskUpdater } from './task-updater.abstract';

@Injectable()
export class TaskService extends TaskCreator implements TaskUpdater {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private dataSource: DataSource, // Injetar o DataSource para Raw SQL
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Occupation)
    private occupationRepository: Repository<Occupation>,
    private taskStrategyFactory: TaskStrategyFactory,
    private taskCreationFactory: TaskCreationFactory,
  ) {
    super();
  }

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const { users, occupations, ...taskData } = createTaskDto;
    
    const task = this.taskCreationFactory.createTask(taskData as CreateTaskDto, this.taskRepository);
    const savedTask = await this.taskRepository.save(task);

    if (users && users.length > 0) {
      const userEntities = await this.userRepository.find({ where: { id: In(users) } });
      savedTask.users = userEntities;
    }

    if (occupations && occupations.length > 0) {
      const occupationEntities = await this.occupationRepository.find({ where: { id: In(occupations) } });
      savedTask.occupations = occupationEntities;
    }

    if ((users && users.length > 0) || (occupations && occupations.length > 0)) {
      return await this.taskRepository.save(savedTask);
    }

    return savedTask;
  }

  async findAll(): Promise<Task[]> {
    this.logger.log('findAll called - getting strategy');
    const strategy = this.taskStrategyFactory.getFindAllStrategy(this.taskRepository);
    this.logger.log(`Using strategy: ${strategy.constructor.name}`);
    const result = await strategy.execute(this.taskRepository);
    this.logger.log(`Found ${result.length} tasks`);
    return result;
  }

  async findOne(id: number): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['users', 'occupations', 'project', 'reviewer'], // Removido comments daqui
    });
    
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

// Raw SQL para buscar comentários e suas respostas
    const comments = await this.dataSource.query(`
      WITH RECURSIVE comment_tree AS (
        SELECT
          c.*,
          json_build_object('id', u.id, 'name', u.name, 'email', u.email) as user,
          (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes_count
        FROM comments c
        LEFT JOIN users u ON u.id = c.user_id
        WHERE c.task_id = $1 AND c.parent_id IS NULL
        UNION ALL
        SELECT
          c.*,
          json_build_object('id', u.id, 'name', u.name, 'email', u.email) as user,
          (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes_count
        FROM comments c
        LEFT JOIN users u ON u.id = c.user_id
        JOIN comment_tree ct ON ct.id = c.parent_id
      )
      SELECT 
        *,
        (SELECT json_agg(json_build_object(
          'id', cl.id,
          'userId', cl.user_id,
          'createdAt', cl.created_at
        )) FROM comment_likes cl WHERE cl.comment_id = comment_tree.id) as likes
      FROM comment_tree;
    `, [id]);

    // Estrutura os comentários em formato aninhado
    const commentsMap = new Map();
    const topLevelComments: any[] = [];
    comments.forEach(comment => {
      comment.replies = [];
      commentsMap.set(comment.id, comment);
      if (comment.parent_id) {
        const parent = commentsMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        topLevelComments.push(comment);
      }
    });

    (task as any).comments = topLevelComments;
    
    // Buscar activity logs da tarefa
    const activityLogs = await this.dataSource.query(`
      SELECT 
        al.*,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email) as user
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.task_id = $1
      ORDER BY al.created_at DESC
      LIMIT 50
    `, [id]);
    
    (task as any).activityLogs = activityLogs;
    // this.logger.debug(`Task data after manual comment hydration: ${JSON.stringify(task, null, 2)}`);
    
    return task;
  }

  async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
    const strategy = this.taskStrategyFactory.getUpdateStrategy(this.taskRepository);
    return await strategy.execute(id, updateTaskDto, this.taskRepository);
  }

  async remove(id: number): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id }, relations: ['project', 'reviewer', 'users', 'occupations'] });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    await this.taskRepository.remove(task);
  }

  async findByProject(projectId: number): Promise<Task[]> {
    return await this.taskRepository.find({ where: { project_id: projectId }, relations: ['project', 'reviewer', 'users', 'occupations'] });
  }

  async findByStatus(status: string): Promise<Task[]> {
    return await this.taskRepository.find({ where: { status: status as any }, relations: ['project', 'reviewer', 'users', 'occupations'] });
  }

  async updateTimer(id: number, timerValue: number): Promise<Task> {
    const strategy = this.taskStrategyFactory.getTimerUpdateStrategy(this.taskRepository);
    return await strategy.execute(id, timerValue, this.taskRepository);
  }

  async assignUsers(taskId: number, userIds: number[]): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id: taskId }, relations: ['project', 'reviewer', 'users', 'occupations'] });
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }
    (task as any).users = userIds.map(id => ({ id }));
    if (typeof (this.taskRepository as any).update === 'function') {
      await (this.taskRepository as any).update(taskId, { users: userIds });
      return await this.taskRepository.findOne({ where: { id: taskId }, relations: ['project', 'reviewer', 'users', 'occupations'] }) as Task;
    }
    return await this.taskRepository.save(task);
  }
}
