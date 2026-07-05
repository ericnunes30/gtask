import {
  NotificationType,
  NotificationPriority,
} from '../interfaces/notification.types';
import { TaskCreatedStrategy } from './task-created.strategy';
import { TaskStatusUpdatedStrategy } from './task-status-updated.strategy';
import { CommentCreatedStrategy } from './comment-created.strategy';
import { InvalidStrategyPayloadException } from '../exceptions/invalid-strategy-payload.exception';

describe('Notification strategies', () => {
  describe('TaskCreatedStrategy', () => {
    const strategy = new TaskCreatedStrategy();

    const validPayload = {
      task: {
        id: 1,
        title: 'Task title',
        priority: 'alta',
        project: { id: 1, title: 'Project' },
      },
      createdBy: 1,
      performer: { id: 1, name: 'User' },
    };

    it('should validate a correct payload', () => {
      expect(strategy.validate(validPayload)).toBe(true);
    });

    it('should reject invalid payload', () => {
      expect(strategy.validate({})).toBe(false);
    });

    it('should create a notification', () => {
      const notification = strategy.create(validPayload);

      expect(notification.type).toBe(NotificationType.TASK_CREATED);
      expect(notification.data).toMatchObject({
        actorName: 'User',
        taskTitle: 'Task title',
      });
    });

    it('should return high priority for alta priority', () => {
      expect(strategy.getPriority(validPayload)).toBe(
        NotificationPriority.HIGH,
      );
    });

    it('should reject payload without task.title', () => {
      expect(
        strategy.validate({
          task: { id: 1, priority: 'alta' },
          createdBy: 1,
        }),
      ).toBe(false);
    });

    it('should reject payload without createdBy', () => {
      expect(
        strategy.validate({
          task: { id: 1, title: 'Task', priority: 'alta' },
        }),
      ).toBe(false);
    });

    it('should reject payload with non-number createdBy', () => {
      expect(
        strategy.validate({
          task: { id: 1, title: 'Task', priority: 'alta' },
          createdBy: '1',
        }),
      ).toBe(false);
    });

    it('should not add project tag when task has no project', () => {
      const notification = strategy.create({
        task: { id: 1, title: 'Task', priority: 'alta' },
        createdBy: 1,
        performer: { id: 1, name: 'User' },
      });

      expect(notification.metadata.tags).not.toContain('project');
    });

    it('should add project tag when task has project', () => {
      const notification = strategy.create({
        task: {
          id: 1,
          title: 'Task',
          priority: 'alta',
          project: { id: 1, title: 'Project' },
        },
        createdBy: 1,
        performer: { id: 1, name: 'User' },
      });

      expect(notification.metadata.tags).toContain('project');
    });

    it('should return URGENT priority for urgente', () => {
      expect(
        strategy.getPriority({
          task: { id: 1, title: 'Task', priority: 'urgente' },
          createdBy: 1,
        }),
      ).toBe(NotificationPriority.URGENT);
    });

    it('should return MEDIUM priority for unknown priority (fallback)', () => {
      expect(
        strategy.getPriority({
          task: { id: 1, title: 'Task', priority: 'desconhecida' },
          createdBy: 1,
        }),
      ).toBe(NotificationPriority.MEDIUM);
    });

    it('should use default actor name when performer is missing', () => {
      const notification = strategy.create({
        task: { id: 1, title: 'Task', priority: 'alta' },
        createdBy: 1,
      });

      expect(notification.data).toMatchObject({
        actorName: 'Usuário desconhecido',
      });
    });
  });

  describe('TaskStatusUpdatedStrategy', () => {
    const strategy = new TaskStatusUpdatedStrategy();

    const validPayload = {
      task: { id: 1, title: 'Task title' },
      oldStatus: 'pendente',
      newStatus: 'em_progresso',
      updatedBy: 1,
      performer: { id: 1, name: 'User' },
    };

    it('should validate a correct payload', () => {
      expect(strategy.validate(validPayload)).toBe(true);
    });

    it('should reject invalid payload', () => {
      expect(strategy.validate({ task: {} })).toBe(false);
    });

    it('should create a notification', () => {
      const notification = strategy.create(validPayload);

      expect(notification.type).toBe(NotificationType.TASK_STATUS_CHANGED);
      expect(notification.data).toMatchObject({
        actorName: 'User',
        taskTitle: 'Task title',
      });
    });

    it('should return low priority by default', () => {
      expect(strategy.getPriority(validPayload)).toBe(NotificationPriority.LOW);
    });

    it('should reject payload without updatedBy', () => {
      expect(
        strategy.validate({
          task: { id: 1, title: 'Task' },
          oldStatus: 'pendente',
          newStatus: 'em_andamento',
        }),
      ).toBe(false);
    });

    it('should reject payload without oldStatus', () => {
      expect(
        strategy.validate({
          task: { id: 1, title: 'Task' },
          newStatus: 'em_andamento',
          updatedBy: 1,
        }),
      ).toBe(false);
    });

    it('should reject payload without task', () => {
      expect(
        strategy.validate({
          oldStatus: 'pendente',
          newStatus: 'em_andamento',
          updatedBy: 1,
        }),
      ).toBe(false);
    });

    it('should throw InvalidStrategyPayloadException when payload is invalid', () => {
      expect(() => strategy.create({})).toThrow(
        InvalidStrategyPayloadException,
      );
    });

    it('should use default actor name when performer is missing', () => {
      const notification = strategy.create({
        task: { id: 1, title: 'Task' },
        oldStatus: 'pendente',
        newStatus: 'em_andamento',
        updatedBy: 1,
      });

      expect(notification.data).toMatchObject({
        actorName: 'Usuário desconhecido',
      });
    });

    it('should add project tag when task has project', () => {
      const notification = strategy.create({
        task: { id: 1, title: 'Task', project: { id: 1, title: 'Project' } },
        oldStatus: 'pendente',
        newStatus: 'em_andamento',
        updatedBy: 1,
      });

      expect(notification.metadata.tags).toContain('project');
    });

    it('should return HIGH priority for critical statuses', () => {
      expect(
        strategy.getPriority({ oldStatus: 'pendente', newStatus: 'concluido' }),
      ).toBe(NotificationPriority.HIGH);
    });

    it('should return MEDIUM priority for medium status from pendente', () => {
      expect(
        strategy.getPriority({
          oldStatus: 'pendente',
          newStatus: 'em_andamento',
        }),
      ).toBe(NotificationPriority.MEDIUM);
    });
  });

  describe('CommentCreatedStrategy', () => {
    const strategy = new CommentCreatedStrategy();

    const validPayload = {
      comment: {
        id: 1,
        content: 'Nice work',
        task: { id: 1, title: 'Task title' },
      },
      createdBy: 1,
      performer: { id: 1, name: 'User' },
    };

    it('should validate a correct payload', () => {
      expect(strategy.validate(validPayload)).toBe(true);
    });

    it('should reject invalid payload', () => {
      expect(strategy.validate({})).toBe(false);
    });

    it('should create a notification', () => {
      const notification = strategy.create(validPayload);

      expect(notification.type).toBe(NotificationType.COMMENT_CREATED);
      expect(notification.data).toMatchObject({
        actorName: 'User',
        commentSnippet: 'Nice work',
      });
    });

    it('should return medium priority by default', () => {
      expect(strategy.getPriority(validPayload)).toBe(
        NotificationPriority.MEDIUM,
      );
    });

    it('should reject payload without comment content', () => {
      expect(
        strategy.validate({
          comment: { id: 1, task: { id: 1, title: 'Task' } },
          createdBy: 1,
        }),
      ).toBe(false);
    });

    it('should reject payload without comment task', () => {
      expect(
        strategy.validate({
          comment: { id: 1, content: 'Nice' },
          createdBy: 1,
        }),
      ).toBe(false);
    });

    it('should reject payload without createdBy', () => {
      expect(
        strategy.validate({
          comment: {
            id: 1,
            content: 'Nice',
            task: { id: 1, title: 'Task' },
          },
        }),
      ).toBe(false);
    });

    it('should throw InvalidStrategyPayloadException when payload is invalid', () => {
      expect(() => strategy.create({})).toThrow(
        InvalidStrategyPayloadException,
      );
    });

    it('should truncate long comment content to 47 chars plus ellipsis', () => {
      const longContent = 'a'.repeat(60);
      const notification = strategy.create({
        comment: {
          id: 1,
          content: longContent,
          task: { id: 1, title: 'Task' },
        },
        createdBy: 1,
        performer: { id: 1, name: 'User' },
      });

      expect(notification.data).toMatchObject({
        commentSnippet: 'a'.repeat(47) + '...',
      });
    });

    it('should use default actor name when performer is missing', () => {
      const notification = strategy.create({
        comment: {
          id: 1,
          content: 'Nice work',
          task: { id: 1, title: 'Task' },
        },
        createdBy: 1,
      });

      expect(notification.data).toMatchObject({
        actorName: 'Usuário desconhecido',
      });
    });
  });
});
