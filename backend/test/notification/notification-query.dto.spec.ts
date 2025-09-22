import { validate } from 'class-validator';
import { NotificationQueryDto, NotificationSearchDto } from '../../src/modules/notification/dto/notification-query.dto';
import { 
  NotificationType, 
  NotificationPriority, 
  NotificationCategory 
} from '../../src/modules/notification/interfaces/notification.types';

describe('NotificationQueryDto', () => {
  describe('Validation', () => {
    it('should validate with no filters (empty dto)', async () => {
      const dto = new NotificationQueryDto();

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with boolean unreadOnly', async () => {
      const dto = new NotificationQueryDto();
      dto.unreadOnly = true;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with valid types array', async () => {
      const dto = new NotificationQueryDto();
      dto.types = [NotificationType.TASK_CREATED, NotificationType.COMMENT_CREATED];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with valid priorities array', async () => {
      const dto = new NotificationQueryDto();
      dto.priorities = [NotificationPriority.HIGH, NotificationPriority.MEDIUM];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with valid categories array', async () => {
      const dto = new NotificationQueryDto();
      dto.categories = [NotificationCategory.TASK, NotificationCategory.COMMENT];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with valid date range', async () => {
      const dto = new NotificationQueryDto();
      dto.startDate = '2023-01-01T00:00:00Z';
      dto.endDate = '2023-12-31T23:59:59Z';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with valid pagination', async () => {
      const dto = new NotificationQueryDto();
      dto.limit = 10;
      dto.offset = 20;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with all filters combined', async () => {
      const dto = new NotificationQueryDto();
      dto.unreadOnly = true;
      dto.types = [NotificationType.TASK_CREATED, NotificationType.TASK_STATUS_CHANGED];
      dto.priorities = [NotificationPriority.HIGH, NotificationPriority.URGENT];
      dto.categories = [NotificationCategory.TASK];
      dto.startDate = '2023-01-01T00:00:00Z';
      dto.endDate = '2023-12-31T23:59:59Z';
      dto.limit = 50;
      dto.offset = 100;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when types array contains invalid type', async () => {
      const dto = new NotificationQueryDto();
      dto.types = [NotificationType.TASK_CREATED, 'invalid.type' as NotificationType];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'types')).toBe(true);
    });

    it('should fail validation when priorities array contains invalid priority', async () => {
      const dto = new NotificationQueryDto();
      dto.priorities = [NotificationPriority.HIGH, 'invalid.priority' as NotificationPriority];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'priorities')).toBe(true);
    });

    it('should fail validation when categories array contains invalid category', async () => {
      const dto = new NotificationQueryDto();
      dto.categories = [NotificationCategory.TASK, 'invalid.category' as NotificationCategory];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'categories')).toBe(true);
    });

    it('should fail validation when startDate is invalid date format', async () => {
      const dto = new NotificationQueryDto();
      dto.startDate = 'invalid-date';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'startDate')).toBe(true);
    });

    it('should fail validation when endDate is invalid date format', async () => {
      const dto = new NotificationQueryDto();
      dto.endDate = 'invalid-date';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'endDate')).toBe(true);
    });

    it('should fail validation when limit is not a number', async () => {
      const dto = new NotificationQueryDto();
      dto.limit = 'invalid' as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'limit')).toBe(true);
    });

    it('should fail validation when offset is not a number', async () => {
      const dto = new NotificationQueryDto();
      dto.offset = 'invalid' as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'offset')).toBe(true);
    });

    it('should fail validation when unreadOnly is not a boolean', async () => {
      const dto = new NotificationQueryDto();
      dto.unreadOnly = 'true' as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'unreadOnly')).toBe(true);
    });

    it('should validate with zero values', async () => {
      const dto = new NotificationQueryDto();
      dto.limit = 0;
      dto.offset = 0;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with negative values', async () => {
      const dto = new NotificationQueryDto();
      dto.limit = -1;
      dto.offset = -5;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with large values', async () => {
      const dto = new NotificationQueryDto();
      dto.limit = 10000;
      dto.offset = 50000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with empty arrays', async () => {
      const dto = new NotificationQueryDto();
      dto.types = [];
      dto.priorities = [];
      dto.categories = [];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle string conversion for boolean fields', async () => {
      const dto = new NotificationQueryDto();
      dto.unreadOnly = 'false' as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'unreadOnly')).toBe(true);
    });

    it('should handle string conversion for number fields', async () => {
      const dto = new NotificationQueryDto();
      dto.limit = '10' as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'limit')).toBe(true);
    });
  });
});

describe('NotificationSearchDto', () => {
  describe('Validation', () => {
    it('should validate as extension of NotificationQueryDto', async () => {
      const dto = new NotificationSearchDto();
      dto.unreadOnly = true;
      dto.searchTerms = ['test', 'search'];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with empty searchTerms array', async () => {
      const dto = new NotificationSearchDto();
      dto.searchTerms = [];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with single search term', async () => {
      const dto = new NotificationSearchDto();
      dto.searchTerms = ['test'];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with multiple search terms', async () => {
      const dto = new NotificationSearchDto();
      dto.searchTerms = ['test', 'search', 'query'];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with all query filters and search terms', async () => {
      const dto = new NotificationSearchDto();
      dto.unreadOnly = true;
      dto.types = [NotificationType.TASK_CREATED];
      dto.priorities = [NotificationPriority.HIGH];
      dto.categories = [NotificationCategory.TASK];
      dto.startDate = '2023-01-01T00:00:00Z';
      dto.endDate = '2023-12-31T23:59:59Z';
      dto.limit = 20;
      dto.offset = 0;
      dto.searchTerms = ['urgent', 'task'];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should inherit all validation rules from parent class', async () => {
      const dto = new NotificationSearchDto();
      dto.types = [NotificationType.TASK_CREATED, 'invalid.type' as NotificationType];
      dto.searchTerms = ['test'];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'types')).toBe(true);
    });

    it('should validate with null searchTerms', async () => {
      const dto = new NotificationSearchDto();
      dto.searchTerms = null as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'searchTerms')).toBe(true);
    });

    it('should validate with non-array searchTerms', async () => {
      const dto = new NotificationSearchDto();
      dto.searchTerms = 'invalid' as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'searchTerms')).toBe(true);
    });
  });
});