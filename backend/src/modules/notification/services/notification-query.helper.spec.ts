import { SelectQueryBuilder } from 'typeorm';
import { NotificationQueryHelper } from './notification-query.helper';
import { StructuredNotificationEntity } from '../entities/notification.entity';
import {
  NotificationQueryOptions,
  NotificationType,
  NotificationPriority,
  NotificationCategory,
} from '../interfaces/notification.types';

function createMockQueryBuilder(): jest.Mocked<
  SelectQueryBuilder<StructuredNotificationEntity>
> {
  return {
    andWhere: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<SelectQueryBuilder<StructuredNotificationEntity>>;
}

describe('NotificationQueryHelper', () => {
  let queryBuilder: jest.Mocked<
    SelectQueryBuilder<StructuredNotificationEntity>
  >;

  beforeEach(() => {
    queryBuilder = createMockQueryBuilder();
  });

  describe('applyFilters', () => {
    it('should apply unreadOnly filter', () => {
      const options: NotificationQueryOptions = { unreadOnly: true };

      NotificationQueryHelper.applyFilters(queryBuilder, options);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.isRead = false',
      );
    });

    it('should apply types filter', () => {
      const options: NotificationQueryOptions = {
        types: [NotificationType.TASK_CREATED, NotificationType.TASK_UPDATED],
      };

      NotificationQueryHelper.applyFilters(queryBuilder, options);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.type IN (:...types)',
        { types: options.types },
      );
    });

    it('should apply priorities filter', () => {
      const options: NotificationQueryOptions = {
        priorities: [NotificationPriority.HIGH, NotificationPriority.URGENT],
      };

      NotificationQueryHelper.applyFilters(queryBuilder, options);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.priority IN (:...priorities)',
        { priorities: options.priorities },
      );
    });

    it('should apply categories filter', () => {
      const options: NotificationQueryOptions = {
        categories: [NotificationCategory.TASK, NotificationCategory.COMMENT],
      };

      NotificationQueryHelper.applyFilters(queryBuilder, options);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "notification.metadata->>'category' IN (:...categories)",
        { categories: options.categories },
      );
    });

    it('should apply startDate filter', () => {
      const startDate = '2024-01-01';
      const options: NotificationQueryOptions = { startDate };

      NotificationQueryHelper.applyFilters(queryBuilder, options);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.createdAt >= :startDate',
        { startDate },
      );
    });

    it('should apply endDate filter', () => {
      const endDate = '2024-12-31';
      const options: NotificationQueryOptions = { endDate };

      NotificationQueryHelper.applyFilters(queryBuilder, options);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.createdAt <= :endDate',
        { endDate },
      );
    });

    it('should apply multiple filters together', () => {
      const options: NotificationQueryOptions = {
        unreadOnly: true,
        types: [NotificationType.TASK_CREATED],
        priorities: [NotificationPriority.HIGH],
        categories: [NotificationCategory.TASK],
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      NotificationQueryHelper.applyFilters(queryBuilder, options);

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(6);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.isRead = false',
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.type IN (:...types)',
        { types: options.types },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.priority IN (:...priorities)',
        { priorities: options.priorities },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "notification.metadata->>'category' IN (:...categories)",
        { categories: options.categories },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.createdAt >= :startDate',
        { startDate: options.startDate },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.createdAt <= :endDate',
        { endDate: options.endDate },
      );
    });

    it('should not apply filters when options are empty', () => {
      const options: NotificationQueryOptions = {};

      NotificationQueryHelper.applyFilters(queryBuilder, options);

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should not apply types filter when array is empty', () => {
      const options: NotificationQueryOptions = { types: [] };

      NotificationQueryHelper.applyFilters(queryBuilder, options);

      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
        'notification.type IN (:...types)',
        expect.anything(),
      );
    });

    it('should not apply priorities filter when array is empty', () => {
      const options: NotificationQueryOptions = { priorities: [] };

      NotificationQueryHelper.applyFilters(queryBuilder, options);

      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
        'notification.priority IN (:...priorities)',
        expect.anything(),
      );
    });

    it('should not apply categories filter when array is empty', () => {
      const options: NotificationQueryOptions = { categories: [] };

      NotificationQueryHelper.applyFilters(queryBuilder, options);

      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
        "notification.metadata->>'category' IN (:...categories)",
        expect.anything(),
      );
    });
  });
});
