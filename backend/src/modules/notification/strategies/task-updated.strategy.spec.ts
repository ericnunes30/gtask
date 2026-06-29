import {
  NotificationType,
  NotificationPriority,
} from '../interfaces/notification.types';
import { TaskUpdatedStrategy } from './task-updated.strategy';
import { InvalidStrategyPayloadException } from '../exceptions/invalid-strategy-payload.exception';

describe('TaskUpdatedStrategy', () => {
  let strategy: TaskUpdatedStrategy;

  const validPayload = {
    task: { id: 1, title: 'Task', status: 'open' },
    updatedBy: 1,
    performer: { id: 1, name: 'User', email: 'user@test.com' },
    changedFields: [
      { field: 'status', oldValue: 'open', newValue: 'in_progress' },
    ],
  };

  beforeEach(() => {
    strategy = new TaskUpdatedStrategy();
  });

  describe('validate', () => {
    it('should return true with a valid payload', () => {
      expect(strategy.validate(validPayload)).toBe(true);
    });

    it('should return false when task is missing', () => {
      const payload = { updatedBy: 1, changedFields: [] };
      expect(strategy.validate(payload)).toBe(false);
    });

    it('should return false when updatedBy is missing', () => {
      const payload = {
        task: { id: 1, title: 'Task' },
        changedFields: [],
      };
      expect(strategy.validate(payload)).toBe(false);
    });

    it('should return false when changedFields is missing', () => {
      const payload = { task: { id: 1, title: 'Task' }, updatedBy: 1 };
      expect(strategy.validate(payload)).toBe(false);
    });

    it('should return false when updatedBy is not a number', () => {
      const payload = {
        task: { id: 1, title: 'Task' },
        updatedBy: '1',
        changedFields: [],
      };
      expect(strategy.validate(payload)).toBe(false);
    });
  });

  describe('create', () => {
    it('should return a StructuredNotification with priority MEDIUM', () => {
      const notification = strategy.create(validPayload);

      expect(notification.type).toBe(NotificationType.TASK_UPDATED);
      expect(notification.priority).toBe(NotificationPriority.MEDIUM);
      expect(notification.data).toMatchObject({
        actorName: 'User',
        taskTitle: 'Task',
        taskId: 1,
        changedFields: [
          { field: 'status', oldValue: 'open', newValue: 'in_progress' },
        ],
      });
    });

    it('should throw InvalidStrategyPayloadException for an invalid payload', () => {
      expect(() => strategy.create({})).toThrow(
        InvalidStrategyPayloadException,
      );
    });
  });

  describe('getPriority', () => {
    it('should return MEDIUM priority', () => {
      expect(strategy.getPriority(validPayload)).toBe(
        NotificationPriority.MEDIUM,
      );
    });
  });
});
