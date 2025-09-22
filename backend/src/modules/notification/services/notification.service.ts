import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StructuredNotificationEntity } from '../entities/notification.entity';
import { 
  StructuredNotification, 
  NotificationQueryOptions,
  NotificationPagination
} from '../interfaces/notification.types';
import { NotificationFactory } from '../factories/notification.factory';
import { DebugLoggerService } from './debug-logger.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(StructuredNotificationEntity)
    private readonly repository: Repository<StructuredNotificationEntity>,
    private readonly notificationFactory: NotificationFactory,
    private readonly debugLogger: DebugLoggerService,
  ) {}

  async create(notification: Omit<StructuredNotification, 'id'>): Promise<StructuredNotification> {
    try {
      // Validar notificação antes de criar
      if (!this.notificationFactory.validateNotification(notification)) {
        throw new Error('Invalid notification data');
      }

      this.logger.log(`CREATING NOTIFICATION: User ${notification.userId}, Type ${notification.type}, Priority ${notification.priority}`);

      // Converter para entidade e salvar
      const entity = StructuredNotificationEntity.fromDomain(notification as StructuredNotification);
      const savedEntity = await this.repository.save(entity);
      
      this.logger.log(`NOTIFICATION CREATED SUCCESSFULLY: ID ${savedEntity.id}, User ${notification.userId}, Type ${notification.type}`);
      
      this.logger.log(`Notification created successfully for user ${notification.userId} with ID ${savedEntity.id}`);
      this.debugLogger.logNotificationEvent('notification_created', {
        id: savedEntity.id,
        userId: notification.userId,
        type: notification.type,
        priority: notification.priority
      }, notification.userId);
      
      return savedEntity.toDomain();
    } catch (error) {
      this.logger.error(`NOTIFICATION CREATION FAILED: User ${notification.userId}, Type ${notification.type}, Error: ${error.message}`);
      
      this.logger.error(`Failed to create notification for user ${notification.userId}:`, error);
      this.debugLogger.logError(error, `Notification creation failed for user ${notification.userId}`);
      throw error;
    }
  }

  async findById(id: number, userId?: number): Promise<StructuredNotification | null> {
    const query = this.repository.createQueryBuilder('notification')
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
    this.debugLogger.logNotificationEvent('notifications_query_start', { options }, userId);
    const { limit = 20, offset = 0 } = options;

    const queryBuilder = this.repository.createQueryBuilder('notification');

    queryBuilder.where('notification.userId = :userId', { userId });

    this.applyFilters(queryBuilder, options);

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
    this.debugLogger.logNotificationEvent('notifications_query_end', { total: result.total, page: result.page, pageSize: result.pageSize }, userId);
    return result;
  }

  private applyFilters(queryBuilder: any, options: NotificationQueryOptions) {
    const {
      unreadOnly,
      types,
      priorities,
      categories,
      startDate,
      endDate,
    } = options;

    if (unreadOnly) {
      queryBuilder.andWhere('notification.isRead = false');
    }

    if (types && types.length > 0) {
      queryBuilder.andWhere('notification.type IN (:...types)', { types });
    }

    if (priorities && priorities.length > 0) {
      queryBuilder.andWhere('notification.priority IN (:...priorities)', {
        priorities,
      });
    }

    if (categories && categories.length > 0) {
      queryBuilder.andWhere(
        "notification.metadata->>'category' IN (:...categories)",
        { categories },
      );
    }

    if (startDate) {
      queryBuilder.andWhere('notification.createdAt >= :startDate', {
        startDate,
      });
    }

    if (endDate) {
      queryBuilder.andWhere('notification.createdAt <= :endDate', { endDate });
    }
  }

  async markAsRead(id: number, userId: number): Promise<void> {
    await this.repository.update(
      { id, userId },
      { 
        isRead: true,
        readAt: new Date()
      }
    );
    this.debugLogger.logNotificationEvent('notification_marked_as_read', { id }, userId);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.repository.update(
      { userId, isRead: false },
      { 
        isRead: true,
        readAt: new Date()
      }
    );
    this.debugLogger.logNotificationEvent('notifications_marked_all_read', {}, userId);
  }

  async delete(id: number, userId: number): Promise<void> {
    await this.repository.delete({ id, userId });
    this.debugLogger.logNotificationEvent('notification_deleted', { id }, userId);
  }

  async deleteExpired(): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();
    this.debugLogger.logNotificationEvent('notifications_deleted_expired', {}, 0);
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.repository.count({
      where: {
        userId,
        isRead: false
      }
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
        .getRawMany()
    ]);

    return {
      total,
      unread,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {} as Record<string, number>),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = parseInt(item.count);
        return acc;
      }, {} as Record<string, number>)
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
    this.debugLogger.logNotificationEvent('notifications_cleanup_old', { daysToKeep, deleted }, 0);
    return deleted;
  }

  // Método para buscar notificações com filtros avançados
  async searchNotifications(
    userId: number,
    searchTerm: string,
    options: NotificationQueryOptions = {}
  ): Promise<NotificationPagination> {
    try {
      // Busca em texto nos metadados e dados
      const searchOptions: NotificationQueryOptions = {
        ...options,
        // Adicionar lógica de busca textual se necessário
      };

      return await this.findByUser(userId, searchOptions);
    } catch (error) {
      this.logger.error(`Failed to search notifications for user ${userId}:`, error);
      throw error;
    }
  }
}
