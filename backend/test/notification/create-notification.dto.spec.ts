import { validate } from 'class-validator';
import { 
  CreateNotificationDto, 
  TaskCreatedDataDto, 
  TaskStatusUpdatedDataDto, 
  CommentCreatedDataDto, 
  TaskUpdatedDataDto,
  ChangedFieldDto 
} from '../../src/modules/notification/dto/create-notification.dto';
import { 
  NotificationType, 
  NotificationPriority, 
  NotificationCategory,
  TaskCreatedData,
  TaskStatusUpdatedData,
  CommentCreatedData,
  TaskUpdatedData
} from '../../src/modules/notification/interfaces/notification.types';

describe('CreateNotificationDto', () => {
  describe('Validation', () => {
    it('should validate with TaskCreatedData', async () => {
      const dto = new CreateNotificationDto();
      dto.userId = 1;
      dto.type = NotificationType.TASK_CREATED;
      dto.priority = NotificationPriority.MEDIUM;
      dto.data = {
        actorName: 'Test User',
        taskTitle: 'Test Task',
        projectTitle: 'Test Project'
      };
      dto.metadata = {
        source: 'test',
        category: NotificationCategory.TASK,
        tags: ['test'],
        version: '1.0'
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with TaskStatusUpdatedData', async () => {
      const dto = new CreateNotificationDto();
      dto.userId = 1;
      dto.type = NotificationType.TASK_STATUS_CHANGED;
      dto.priority = NotificationPriority.HIGH;
      dto.data = {
        actorName: 'Test User',
        taskTitle: 'Test Task',
        oldStatus: 'pendente',
        newStatus: 'em_andamento'
      };
      dto.metadata = {
        source: 'test',
        category: NotificationCategory.TASK,
        tags: ['test'],
        version: '1.0'
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with CommentCreatedData', async () => {
      const dto = new CreateNotificationDto();
      dto.userId = 1;
      dto.type = NotificationType.COMMENT_CREATED;
      dto.priority = NotificationPriority.MEDIUM;
      dto.data = {
        actorName: 'Test User',
        taskTitle: 'Test Task',
        commentSnippet: 'Test comment'
      };
      dto.metadata = {
        source: 'test',
        category: NotificationCategory.COMMENT,
        tags: ['test'],
        version: '1.0'
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with TaskUpdatedData', async () => {
      const dto = new CreateNotificationDto();
      dto.userId = 1;
      dto.type = NotificationType.TASK_UPDATED;
      dto.priority = NotificationPriority.MEDIUM;
      dto.data = {
        actorName: 'Test User',
        taskTitle: 'Test Task',
        changedFields: [
          { field: 'priority', oldValue: 'media', newValue: 'alta' },
          { field: 'due_date', oldValue: '2023-12-01', newValue: '2023-11-30' }
        ]
      };
      dto.metadata = {
        source: 'test',
        category: NotificationCategory.TASK,
        tags: ['test'],
        version: '1.0'
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with old data format', async () => {
      const dto = new CreateNotificationDto();
      dto.userId = 1;
      dto.type = NotificationType.TASK_CREATED;
      dto.priority = NotificationPriority.MEDIUM;
      dto.data = {
        entityType: 'task',
        entityId: 1,
        action: 'created',
        changes: {
          task: {
            oldValue: null,
            newValue: { id: 1, title: 'Test Task' }
          }
        },
        relatedEntities: [
          { type: 'task', id: 1, name: 'Test Task' }
        ],
        context: {
          timestamp: '2023-01-01T00:00:00Z',
          source: 'test'
        }
      };
      dto.metadata = {
        source: 'test',
        category: NotificationCategory.TASK,
        tags: ['test'],
        version: '1.0'
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when userId is missing', async () => {
      const dto = new CreateNotificationDto();
      dto.type = NotificationType.TASK_CREATED;
      dto.priority = NotificationPriority.MEDIUM;
      dto.data = {
        actorName: 'Test User',
        taskTitle: 'Test Task'
      };
      dto.metadata = {
        source: 'test',
        category: NotificationCategory.TASK,
        tags: ['test'],
        version: '1.0'
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'userId')).toBe(true);
    });

    it('should fail validation when type is invalid', async () => {
      const dto = new CreateNotificationDto();
      dto.userId = 1;
      dto.type = 'invalid.type' as NotificationType;
      dto.priority = NotificationPriority.MEDIUM;
      dto.data = {
        actorName: 'Test User',
        taskTitle: 'Test Task'
      };
      dto.metadata = {
        source: 'test',
        category: NotificationCategory.TASK,
        tags: ['test'],
        version: '1.0'
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'type')).toBe(true);
    });

    it('should fail validation when priority is invalid', async () => {
      const dto = new CreateNotificationDto();
      dto.userId = 1;
      dto.type = NotificationType.TASK_CREATED;
      dto.priority = 'invalid.priority' as NotificationPriority;
      dto.data = {
        actorName: 'Test User',
        taskTitle: 'Test Task'
      };
      dto.metadata = {
        source: 'test',
        category: NotificationCategory.TASK,
        tags: ['test'],
        version: '1.0'
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'priority')).toBe(true);
    });

    it('should fail validation when data is missing', async () => {
      const dto = new CreateNotificationDto();
      dto.userId = 1;
      dto.type = NotificationType.TASK_CREATED;
      dto.priority = NotificationPriority.MEDIUM;
      dto.data = null as any;
      dto.metadata = {
        source: 'test',
        category: NotificationCategory.TASK,
        tags: ['test'],
        version: '1.0'
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'data')).toBe(true);
    });

    it('should fail validation when metadata is missing', async () => {
      const dto = new CreateNotificationDto();
      dto.userId = 1;
      dto.type = NotificationType.TASK_CREATED;
      dto.priority = NotificationPriority.MEDIUM;
      dto.data = {
        actorName: 'Test User',
        taskTitle: 'Test Task'
      };
      dto.metadata = null as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'metadata')).toBe(true);
    });

    it('should validate optional fields', async () => {
      const dto = new CreateNotificationDto();
      dto.userId = 1;
      dto.type = NotificationType.TASK_CREATED;
      dto.priority = NotificationPriority.MEDIUM;
      dto.data = {
        actorName: 'Test User',
        taskTitle: 'Test Task'
      };
      dto.metadata = {
        source: 'test',
        category: NotificationCategory.TASK,
        tags: ['test'],
        version: '1.0'
      };
      dto.expiresAt = '2023-12-31T23:59:59Z';
      dto.deliveredAt = '2023-12-01T10:00:00Z';
      dto.isRead = true;
      dto.readAt = '2023-12-01T10:00:00Z';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when expiresAt is invalid date format', async () => {
      const dto = new CreateNotificationDto();
      dto.userId = 1;
      dto.type = NotificationType.TASK_CREATED;
      dto.priority = NotificationPriority.MEDIUM;
      dto.data = {
        actorName: 'Test User',
        taskTitle: 'Test Task'
      };
      dto.metadata = {
        source: 'test',
        category: NotificationCategory.TASK,
        tags: ['test'],
        version: '1.0'
      };
      dto.expiresAt = 'invalid-date';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'expiresAt')).toBe(true);
    });

    it('should fail validation when isRead is not boolean', async () => {
      const dto = new CreateNotificationDto();
      dto.userId = 1;
      dto.type = NotificationType.TASK_CREATED;
      dto.priority = NotificationPriority.MEDIUM;
      dto.data = {
        actorName: 'Test User',
        taskTitle: 'Test Task'
      };
      dto.metadata = {
        source: 'test',
        category: NotificationCategory.TASK,
        tags: ['test'],
        version: '1.0'
      };
      dto.isRead = 'true' as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'isRead')).toBe(true);
    });
  });
});

describe('TaskCreatedDataDto', () => {
  describe('Validation', () => {
    it('should validate with required fields', async () => {
      const dto = new TaskCreatedDataDto();
      dto.actorName = 'Test User';
      dto.taskTitle = 'Test Task';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with optional projectTitle', async () => {
      const dto = new TaskCreatedDataDto();
      dto.actorName = 'Test User';
      dto.taskTitle = 'Test Task';
      dto.projectTitle = 'Test Project';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when actorName is missing', async () => {
      const dto = new TaskCreatedDataDto();
      dto.taskTitle = 'Test Task';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'actorName')).toBe(true);
    });

    it('should fail validation when taskTitle is missing', async () => {
      const dto = new TaskCreatedDataDto();
      dto.actorName = 'Test User';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'taskTitle')).toBe(true);
    });

    it('should fail validation when actorName is not string', async () => {
      const dto = new TaskCreatedDataDto();
      dto.actorName = 123 as any;
      dto.taskTitle = 'Test Task';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'actorName')).toBe(true);
    });

    it('should fail validation when taskTitle is not string', async () => {
      const dto = new TaskCreatedDataDto();
      dto.actorName = 'Test User';
      dto.taskTitle = 123 as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'taskTitle')).toBe(true);
    });
  });
});

describe('TaskStatusUpdatedDataDto', () => {
  describe('Validation', () => {
    it('should validate with required fields', async () => {
      const dto = new TaskStatusUpdatedDataDto();
      dto.actorName = 'Test User';
      dto.taskTitle = 'Test Task';
      dto.oldStatus = 'pendente';
      dto.newStatus = 'em_andamento';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when any required field is missing', async () => {
      const dto = new TaskStatusUpdatedDataDto();
      dto.actorName = 'Test User';
      dto.taskTitle = 'Test Task';
      // missing oldStatus and newStatus

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'oldStatus')).toBe(true);
      expect(errors.some(e => e.property === 'newStatus')).toBe(true);
    });
  });
});

describe('CommentCreatedDataDto', () => {
  describe('Validation', () => {
    it('should validate with required fields', async () => {
      const dto = new CommentCreatedDataDto();
      dto.actorName = 'Test User';
      dto.taskTitle = 'Test Task';
      dto.commentSnippet = 'Test comment';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when any required field is missing', async () => {
      const dto = new CommentCreatedDataDto();
      dto.actorName = 'Test User';
      // missing taskTitle and commentSnippet

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'taskTitle')).toBe(true);
      expect(errors.some(e => e.property === 'commentSnippet')).toBe(true);
    });
  });
});

describe('TaskUpdatedDataDto', () => {
  describe('Validation', () => {
    it('should validate with required fields', async () => {
      const dto = new TaskUpdatedDataDto();
      dto.actorName = 'Test User';
      dto.taskTitle = 'Test Task';
      dto.changedFields = [
        { field: 'priority', oldValue: 'media', newValue: 'alta' }
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with multiple changed fields', async () => {
      const dto = new TaskUpdatedDataDto();
      dto.actorName = 'Test User';
      dto.taskTitle = 'Test Task';
      dto.changedFields = [
        { field: 'priority', oldValue: 'media', newValue: 'alta' },
        { field: 'due_date', oldValue: '2023-12-01', newValue: '2023-11-30' },
        { field: 'title', oldValue: 'Old Title', newValue: 'New Title' }
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when changedFields is empty array', async () => {
      const dto = new TaskUpdatedDataDto();
      dto.actorName = 'Test User';
      dto.taskTitle = 'Test Task';
      dto.changedFields = [];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'changedFields')).toBe(true);
    });

    it('should fail validation when changedFields is missing', async () => {
      const dto = new TaskUpdatedDataDto();
      dto.actorName = 'Test User';
      dto.taskTitle = 'Test Task';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'changedFields')).toBe(true);
    });

    it('should fail validation when changedFields items are invalid', async () => {
      const dto = new TaskUpdatedDataDto();
      dto.actorName = 'Test User';
      dto.taskTitle = 'Test Task';
      dto.changedFields = [
        { field: 'priority', oldValue: 'media', newValue: 'alta' },
        { field: '', oldValue: '', newValue: '' } as any // invalid field
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

describe('ChangedFieldDto', () => {
  describe('Validation', () => {
    it('should validate with all fields', async () => {
      const dto = new ChangedFieldDto();
      dto.field = 'priority';
      dto.oldValue = 'media';
      dto.newValue = 'alta';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when field is missing', async () => {
      const dto = new ChangedFieldDto();
      dto.oldValue = 'media';
      dto.newValue = 'alta';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'field')).toBe(true);
    });

    it('should fail validation when oldValue is missing', async () => {
      const dto = new ChangedFieldDto();
      dto.field = 'priority';
      dto.newValue = 'alta';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'oldValue')).toBe(true);
    });

    it('should fail validation when newValue is missing', async () => {
      const dto = new ChangedFieldDto();
      dto.field = 'priority';
      dto.oldValue = 'media';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'newValue')).toBe(true);
    });

    it('should fail validation when field is not string', async () => {
      const dto = new ChangedFieldDto();
      dto.field = 123 as any;
      dto.oldValue = 'media';
      dto.newValue = 'alta';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'field')).toBe(true);
    });
  });
});