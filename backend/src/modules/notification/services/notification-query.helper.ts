import { SelectQueryBuilder } from 'typeorm';
import { StructuredNotificationEntity } from '../entities/notification.entity';
import { NotificationQueryOptions } from '../interfaces/notification.types';

export class NotificationQueryHelper {
  static applyFilters(
    queryBuilder: SelectQueryBuilder<StructuredNotificationEntity>,
    options: NotificationQueryOptions,
  ): void {
    const { unreadOnly, types, priorities, categories, startDate, endDate } =
      options;

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
}
