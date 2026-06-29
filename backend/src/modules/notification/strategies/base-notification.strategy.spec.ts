import {
  NotificationType,
  NotificationPriority,
} from '../interfaces/notification.types';
import {
  BaseNotificationStrategy,
  NotificationPayload,
} from './base-notification.strategy';

class TestStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TIMER_STARTED;

  create(_payload: NotificationPayload) {
    return {} as ReturnType<BaseNotificationStrategy['create']>;
  }

  validate(_payload: NotificationPayload) {
    return true;
  }

  getPriority(_payload: NotificationPayload) {
    return NotificationPriority.LOW;
  }
}

describe('BaseNotificationStrategy', () => {
  let strategy: TestStrategy;

  beforeEach(() => {
    strategy = new TestStrategy();
  });

  describe('createBaseNotification', () => {
    it('should return a base notification with id=0, isRead=false and createdAt as Date', () => {
      const data = { entityType: 'test' } as ReturnType<
        BaseNotificationStrategy['create']
      >['data'];
      const metadata = {
        source: 'test',
        category: 'task' as const,
        tags: ['test'],
        version: '1.0',
      };

      const result = (strategy as unknown as Record<string, unknown>)[
        'createBaseNotification'
      ](
        NotificationType.TIMER_STARTED,
        NotificationPriority.LOW,
        data,
        metadata,
        1,
      ) as ReturnType<BaseNotificationStrategy['create']>;

      expect(result.id).toBe(0);
      expect(result.isRead).toBe(false);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.type).toBe(NotificationType.TIMER_STARTED);
      expect(result.priority).toBe(NotificationPriority.LOW);
      expect(result.userId).toBe(1);
    });
  });

  describe('createTaskRelatedEntities', () => {
    it('should return entities with task only when project is absent', () => {
      const task = { id: 1, title: 'Task', status: 'open', priority: 'low' };

      const result = (strategy as unknown as Record<string, unknown>)[
        'createTaskRelatedEntities'
      ](task) as Array<{ type: string; id: number }>;

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'task',
        id: 1,
        name: 'Task',
        metadata: { status: 'open', priority: 'low' },
      });
    });

    it('should include project entity when project is present', () => {
      const task = {
        id: 1,
        title: 'Task',
        status: 'open',
        project: { id: 2, title: 'Project' },
      };

      const result = (strategy as unknown as Record<string, unknown>)[
        'createTaskRelatedEntities'
      ](task) as Array<{ type: string; id: number }>;

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ type: 'task', id: 1 });
      expect(result[1]).toMatchObject({
        type: 'project',
        id: 2,
        name: 'Project',
      });
    });
  });

  describe('createNotificationContext', () => {
    it('should include performer when provided', () => {
      const performer = { id: 1, name: 'User', email: 'user@test.com' };

      const result = (strategy as unknown as Record<string, unknown>)[
        'createNotificationContext'
      ](performer, 'timer_started', { duration: 300 }) as {
        performer?: { id: number; name: string };
        source: string;
        additionalData?: Record<string, unknown>;
      };

      expect(result.performer).toMatchObject({ id: 1, name: 'User' });
      expect(result.source).toBe('timer_started');
      expect(result.additionalData).toEqual({ duration: 300 });
    });

    it('should omit performer when not provided', () => {
      const result = (strategy as unknown as Record<string, unknown>)[
        'createNotificationContext'
      ](undefined, 'timer_started') as {
        performer?: { id: number };
        source: string;
      };

      expect(result.performer).toBeUndefined();
      expect(result.source).toBe('timer_started');
    });
  });

  describe('createTaskMetadata', () => {
    it('should include default tags merged with custom tags', () => {
      const result = (strategy as unknown as Record<string, unknown>)[
        'createTaskMetadata'
      ](['custom']) as { tags: string[]; source: string };

      expect(result.tags).toEqual(['task', 'custom']);
      expect(result.source).toBe('task_system');
    });

    it('should work with no custom tags', () => {
      const result = (strategy as unknown as Record<string, unknown>)[
        'createTaskMetadata'
      ]() as { tags: string[] };

      expect(result.tags).toEqual(['task']);
    });
  });

  describe('createTimerNotificationData', () => {
    it('should return timer data with correct structure', () => {
      const task = { id: 1, title: 'Task' };
      const performer = { id: 1, name: 'User' };

      const result = (strategy as unknown as Record<string, unknown>)[
        'createTimerNotificationData'
      ](task, 'started', 'running', 300, null, performer) as {
        entityType: string;
        entityId: number;
        action: string;
        changes: {
          timer: {
            oldValue: Record<string, unknown> | null;
            newValue: { taskId: number; duration: number; status: string };
          };
        };
        relatedEntities: Array<{ type: string }>;
        context: { source: string; additionalData?: Record<string, unknown> };
      };

      expect(result.entityType).toBe('timer');
      expect(result.entityId).toBe(1);
      expect(result.action).toBe('started');
      expect(result.changes.timer.oldValue).toBeNull();
      expect(result.changes.timer.newValue).toEqual({
        taskId: 1,
        duration: 300,
        status: 'running',
      });
      expect(result.context.source).toBe('timer_started');
      expect(result.context.additionalData).toEqual({ duration: 300 });
    });

    it('should default duration to 0 when undefined', () => {
      const task = { id: 1, title: 'Task' };

      const result = (strategy as unknown as Record<string, unknown>)[
        'createTimerNotificationData'
      ](
        task,
        'paused',
        'paused',
        undefined,
        { taskId: 0, status: 'running' },
        undefined,
      ) as {
        changes: {
          timer: { newValue: { duration: number } };
        };
        relatedEntities: Array<{ type: string }>;
      };

      expect(result.changes.timer.newValue.duration).toBe(0);
      expect(result.relatedEntities.some((e) => e.type === 'task')).toBe(true);
    });
  });

  describe('createTimerMetadata', () => {
    it('should return metadata with timer tags', () => {
      const result = (strategy as unknown as Record<string, unknown>)[
        'createTimerMetadata'
      ]('paused') as { tags: string[]; source: string };

      expect(result.source).toBe('timer_system');
      expect(result.tags).toEqual(['timer', 'paused', 'task']);
    });
  });
});
