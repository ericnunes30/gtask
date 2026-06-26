import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StructuredNotificationEntity } from '../entities/notification.entity';
import {
  StructuredNotification,
  NotificationQueryOptions,
  NotificationPagination,
} from '../interfaces/notification.types';
import { NotificationFactory } from '../factories/notification.factory';
import { DebugLoggerService } from './debug-logger.service';
import { NotificationQueryHelper } from './notification-query.helper';
import { InvalidNotificationDataException } from '../exceptions/invalid-notification-data.exception';
import { NotificationNotFoundException } from '../exceptions/notification-not-found.exception';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(StructuredNotificationEntity)
    private readonly repository: Repository<StructuredNotificationEntity>,
    private readonly notificationFactory: NotificationFactory,
    private readonly debugLogger: DebugLoggerService,
  ) {}

  async create(
    notification: Omit<StructuredNotification, 'id'>,
  ): Promise<StructuredNotification> {
    try {
      if (!this.notificationFactory.validateNotification(notification)) {
        throw new InvalidNotificationDataException();
      }

      this.logger.log(
        `CREATING NOTIFICATION: User ${notification.userId}, Type ${notification.type}, Priority ${notification.priority}`,
      );

      const entity = StructuredNotificationEntity.fromDomain(
        notification as StructuredNotification,
      );
      const savedEntity = await this.repository.save(entity);

      this.logger.log(
        `NOTIFICATION CREATED SUCCESSFULLY: ID ${savedEntity.id}, User ${notification.userId}, Type ${notification.type}`,
      );
      this.debugLogger.logNotificationEvent(
        'notification_created',
        {
          id: savedEntity.id,
          userId: notification.userId,
          type: notification.type,
          priority: notification.priority,
        },
        notification.userId,
      );

      return savedEntity.toDomain();
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `NOTIFICATION CREATION FAILED: User ${notification.userId}, Type ${notification.type}, Error: ${errMessage}`,
      );
      this.debugLogger.logError(
        error instanceof Error ? error : new Error(errMessage),
        `Notification creation failed for user ${notification.userId}`,
      );
      throw error;
    }
  }

  async findById(
    id: number,
    userId?: number,
  ): Promise<StructuredNotification | null> {
    const query = this.repository
      .createQueryBuilder('notification')
      .where('notification.id = :id', { id });

    if (userId) {
      query.andWhere('notification.userId = :userId', { userId });
    }

    const entity = await query.getOne();
    return entity ? entity.toDomain() : null;
  }

  async findByUser(
    userId: number,
    options: NotificationQueryOptions = {},
  ): Promise<NotificationPagination> {
    this.debugLogger.logNotificationEvent(
      'notifications_query_start',
      { options },
      userId,
    );
    const { limit = 20, offset = 0 } = options;

    const queryBuilder = this.repository.createQueryBuilder('notification');

    queryBuilder.where('notification.userId = :userId', { userId });

    NotificationQueryHelper.applyFilters(queryBuilder, options);

    const [items, total] = await queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const notifications = items.map((entity) => entity.toDomain());

    const result = {
      items: notifications,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      hasNext: offset + limit < total,
      hasPrevious: offset > 0,
    };
    this.debugLogger.logNotificationEvent(
      'notifications_query_end',
      { total: result.total, page: result.page, pageSize: result.pageSize },
      userId,
    );
    return result;
  }

  async markAsRead(id: number, userId: number): Promise<void> {
    const result = await this.repository.update(
      { id, userId },
      {
        isRead: true,
        readAt: new Date(),
      },
    );
    if (result.affected === 0) {
      throw new NotificationNotFoundException(id);
    }
    this.debugLogger.logNotificationEvent(
      'notification_marked_as_read',
      { id },
      userId,
    );
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.repository.update(
      { userId, isRead: false },
      {
        isRead: true,
        readAt: new Date(),
      },
    );
    this.debugLogger.logNotificationEvent(
      'notifications_marked_all_read',
      {},
      userId,
    );
  }

  async delete(id: number, userId: number): Promise<void> {
    const result = await this.repository.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotificationNotFoundException(id);
    }
    this.debugLogger.logNotificationEvent(
      'notification_deleted',
      { id },
      userId,
    );
  }

  async deleteExpired(): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();
    this.debugLogger.logNotificationEvent(
      'notifications_deleted_expired',
      {},
      0,
    );
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.repository.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async getUserStats(userId: number): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const [total, unread, byType, byPriority] = await Promise.all([
      this.repository.count({ where: { userId } }),
      this.repository.count({ where: { userId, isRead: false } }),
      this.repository
        .createQueryBuilder('notification')
        .select('notification.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('notification.userId = :userId', { userId })
        .groupBy('notification.type')
        .getRawMany(),
      this.repository
        .createQueryBuilder('notification')
        .select('notification.priority', 'priority')
        .addSelect('COUNT(*)', 'count')
        .where('notification.userId = :userId', { userId })
        .groupBy('notification.priority')
        .getRawMany(),
    ]);

    interface CountRow {
      type?: string;
      priority?: string;
      count: string | number;
    }
    const byTypeRows = byType as CountRow[];
    const byPriorityRows = byPriority as CountRow[];

    return {
      total,
      unread,
      byType: byTypeRows.reduce(
        (acc, item) => {
          acc[item.type ?? ''] = parseInt(String(item.count));
          return acc;
        },
        {} as Record<string, number>,
      ),
      byPriority: byPriorityRows.reduce(
        (acc, item) => {
          acc[item.priority ?? ''] = parseInt(String(item.count));
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  async cleanupOldNotifications(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .andWhere('isRead = true')
      .execute();

    const deleted = result.affected || 0;
    this.debugLogger.logNotificationEvent(
      'notifications_cleanup_old',
      { daysToKeep, deleted },
      0,
    );
    return deleted;
  }

  async searchNotifications(
    userId: number,
    _searchTerm: string,
    options: NotificationQueryOptions = {},
  ): Promise<NotificationPagination> {
    return await this.findByUser(userId, options);
  }
}
