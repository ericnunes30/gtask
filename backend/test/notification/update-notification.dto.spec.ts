import { validate } from 'class-validator';
import { UpdateNotificationDto } from '../../src/modules/notification/dto/update-notification.dto';
import { 
  NotificationType, 
  NotificationPriority, 
  NotificationCategory 
} from '../../src/modules/notification/interfaces/notification.types';

describe('UpdateNotificationDto', () => {
  describe('Validation', () => {
    it('should validate with empty dto (all fields optional)', async () => {
      const dto = new UpdateNotificationDto();

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with partial updates - userId only', async () => {
      const dto = new UpdateNotificationDto();
      dto.userId = 2;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with partial updates - type only', async () => {
      const dto = new UpdateNotificationDto();
      dto.type = NotificationType.TASK_STATUS_CHANGED;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with partial updates - priority only', async () => {
      const dto = new UpdateNotificationDto();
      dto.priority = NotificationPriority.HIGH;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with partial updates - data only', async () => {
      const dto = new UpdateNotificationDto();
      dto.data = {
        actorName: 'Updated User',
        taskTitle: 'Updated Task'
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with partial updates - metadata only', async () => {
      const dto = new UpdateNotificationDto();
      dto.metadata = {
        source: 'updated',
        category: NotificationCategory.TASK,
        tags: ['updated'],
        version: '2.0'
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with partial updates - expiresAt only', async () => {
      const dto = new UpdateNotificationDto();
      dto.expiresAt = '2023-12-31T23:59:59Z';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with partial updates - deliveredAt only', async () => {
      const dto = new UpdateNotificationDto();
      dto.deliveredAt = '2023-12-01T10:00:00Z';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with partial updates - isRead only', async () => {
      const dto = new UpdateNotificationDto();
      dto.isRead = true;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with partial updates - readAt only', async () => {
      const dto = new UpdateNotificationDto();
      dto.readAt = '2023-12-01T10:00:00Z';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with complete update', async () => {
      const dto = new UpdateNotificationDto();
      dto.userId = 2;
      dto.type = NotificationType.TASK_STATUS_CHANGED;
      dto.priority = NotificationPriority.HIGH;
      dto.data = {
        actorName: 'Updated User',
        taskTitle: 'Updated Task'
      };
      dto.metadata = {
        source: 'updated',
        category: NotificationCategory.TASK,
        tags: ['updated'],
        version: '2.0'
      };
      dto.expiresAt = '2023-12-31T23:59:59Z';
      dto.deliveredAt = '2023-12-01T10:00:00Z';
      dto.isRead = true;
      dto.readAt = '2023-12-01T10:00:00Z';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with TaskCreatedData', async () => {
      const dto = new UpdateNotificationDto();
      dto.data = {
        actorName: 'Updated User',
        taskTitle: 'Updated Task',
        projectTitle: 'Updated Project'
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with TaskStatusUpdatedData', async () => {
      const dto = new UpdateNotificationDto();
      dto.data = {
        actorName: 'Updated User',
        taskTitle: 'Updated Task',
        oldStatus: 'pendente',
        newStatus: 'em_andamento'
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with CommentCreatedData', async () => {
      const dto = new UpdateNotificationDto();
      dto.data = {
        actorName: 'Updated User',
        taskTitle: 'Updated Task',
        commentSnippet: 'Updated comment'
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with TaskUpdatedData', async () => {
      const dto = new UpdateNotificationDto();
      dto.data = {
        actorName: 'Updated User',
        taskTitle: 'Updated Task',
        changedFields: [
          { field: 'priority', oldValue: 'media', newValue: 'alta' }
        ]
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with old data format', async () => {
      const dto = new UpdateNotificationDto();
      dto.data = {
        entityType: 'task',
        entityId: 1,
        action: 'updated',
        changes: {
          task: {
            oldValue: { id: 1, title: 'Old Task' },
            newValue: { id: 1, title: 'Updated Task' }
          }
        }
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when userId is not a number', async () => {
      const dto = new UpdateNotificationDto();
      dto.userId = 'invalid' as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'userId')).toBe(true);
    });

    it('should fail validation when type is invalid', async () => {
      const dto = new UpdateNotificationDto();
      dto.type = 'invalid.type' as NotificationType;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'type')).toBe(true);
    });

    it('should fail validation when priority is invalid', async () => {
      const dto = new UpdateNotificationDto();
      dto.priority = 'invalid.priority' as NotificationPriority;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'priority')).toBe(true);
    });

    it('should fail validation when data is invalid object', async () => {
      const dto = new UpdateNotificationDto();
      dto.data = 'invalid' as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'data')).toBe(true);
    });

    it('should fail validation when metadata is invalid object', async () => {
      const dto = new UpdateNotificationDto();
      dto.metadata = 'invalid' as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'metadata')).toBe(true);
    });

    it('should fail validation when expiresAt is invalid date format', async () => {
      const dto = new UpdateNotificationDto();
      dto.expiresAt = 'invalid-date';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'expiresAt')).toBe(true);
    });

    it('should fail validation when deliveredAt is invalid date format', async () => {
      const dto = new UpdateNotificationDto();
      dto.deliveredAt = 'invalid-date';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'deliveredAt')).toBe(true);
    });

    it('should fail validation when readAt is invalid date format', async () => {
      const dto = new UpdateNotificationDto();
      dto.readAt = 'invalid-date';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'readAt')).toBe(true);
    });

    it('should fail validation when isRead is not boolean', async () => {
      const dto = new UpdateNotificationDto();
      dto.isRead = 'true' as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'isRead')).toBe(true);
    });

    it('should validate with metadata with optional fields', async () => {
      const dto = new UpdateNotificationDto();
      dto.metadata = {
        source: 'updated',
        category: NotificationCategory.TASK,
        tags: ['updated'],
        version: '2.0',
        correlationId: 'test-correlation-id',
        parentNotificationId: 123
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with metadata missing optional fields', async () => {
      const dto = new UpdateNotificationDto();
      dto.metadata = {
        source: 'updated',
        category: NotificationCategory.TASK,
        tags: ['updated'],
        version: '2.0'
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with zero values', async () => {
      const dto = new UpdateNotificationDto();
      dto.userId = 0;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with negative values', async () => {
      const dto = new UpdateNotificationDto();
      dto.userId = -1;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle partial metadata updates', async () => {
      const dto = new UpdateNotificationDto();
      dto.metadata = {
        tags: ['new-tag']
      } as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'metadata')).toBe(true);
    });

    it('should validate with boolean false values', async () => {
      const dto = new UpdateNotificationDto();
      dto.isRead = false;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with boolean zero values', async () => {
      const dto = new UpdateNotificationDto();
      dto.isRead = 0 as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'isRead')).toBe(true);
    });
  });
});