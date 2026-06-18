import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, Between } from 'typeorm';
import { ActivityLog } from '../entities/activity-log.entity';

export interface ActivityLogFilterOptions {
  taskId?: number;
  userId?: number;
  actionType?: string;
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
  ) {}

  async findAll(filters: ActivityLogFilterOptions = {}): Promise<ActivityLog[]> {
    const {
      taskId,
      userId,
      actionType,
      page = 1,
      limit = 20,
      startDate,
      endDate
    } = filters;

    const where: FindOptionsWhere<ActivityLog> = {};

    if (taskId) {
      where.taskId = taskId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (actionType) {
      where.actionType = Like(`%${actionType}%`);
    }

    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    } else if (startDate) {
      where.createdAt = Between(startDate, new Date());
    } else if (endDate) {
      where.createdAt = Between(new Date(0), endDate);
    }

    const skip = (page - 1) * limit;

    return this.activityLogRepository.find({
      where,
      relations: ['user', 'task'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
  }

  async findByTaskId(taskId: number, page: number = 1, limit: number = 20): Promise<ActivityLog[]> {
    const skip = (page - 1) * limit;

    return this.activityLogRepository.find({
      where: { taskId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
  }

  async findRecentByTaskId(taskId: number, limit: number = 10): Promise<ActivityLog[]> {
    return this.activityLogRepository.find({
      where: { taskId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async countByTaskId(taskId: number): Promise<number> {
    return this.activityLogRepository.count({
      where: { taskId }
    });
  }

  async create(activityLogData: Partial<ActivityLog>): Promise<ActivityLog> {
    const activityLog = this.activityLogRepository.create(activityLogData);
    return this.activityLogRepository.save(activityLog);
  }
}