import {
  NotificationType,
  NotificationPriority,
} from '../interfaces/notification.types';
import { TaskCreatedStrategy } from './task-created.strategy';
import { TaskStatusUpdatedStrategy } from './task-status-updated.strategy';
import { CommentCreatedStrategy } from './comment-created.strategy';

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
  });
});
