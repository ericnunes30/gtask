import { NotificationRecipientService } from './notification-recipient.service';
import { Task } from '../../tasks/entities/task.entity';
import { Comment } from '../../comment/entities/comment.entity';

describe('NotificationRecipientService', () => {
  let service: NotificationRecipientService;

  beforeEach(() => {
    service = new NotificationRecipientService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTaskCreatedNotificationRecipients', () => {
    it('should return assigned user ids excluding creator', () => {
      const task = {
        users: [{ id: 1 }, { id: 2 }, { id: 3 }],
      } as Task;

      const result = service.getTaskCreatedNotificationRecipients(task, 1);

      expect(result).toEqual([2, 3]);
    });

    it('should return empty array when no users are assigned', () => {
      const task = { users: [] } as Task;

      const result = service.getTaskCreatedNotificationRecipients(task, 1);

      expect(result).toEqual([]);
    });

    it('should return empty array when users property is undefined', () => {
      const task = {} as Task;

      const result = service.getTaskCreatedNotificationRecipients(task, 1);

      expect(result).toEqual([]);
    });
  });

  describe('getCommentCreatedNotificationRecipients', () => {
    it('should return task assignees excluding comment author', () => {
      const comment = {
        task: {
          users: [{ id: 1 }, { id: 2 }, { id: 3 }],
        },
      } as Comment;

      const result = service.getCommentCreatedNotificationRecipients(
        comment,
        2,
      );

      expect(result).toEqual([1, 3]);
    });

    it('should return empty array when task has no users', () => {
      const comment = {
        task: { users: [] },
      } as Comment;

      const result = service.getCommentCreatedNotificationRecipients(
        comment,
        1,
      );

      expect(result).toEqual([]);
    });

    it('should return empty array when task is undefined', () => {
      const comment = {} as Comment;

      const result = service.getCommentCreatedNotificationRecipients(
        comment,
        1,
      );

      expect(result).toEqual([]);
    });
  });

  describe('getTaskStatusUpdatedNotificationRecipients', () => {
    it('should return reviewer id when status is em_revisao and reviewer is different from updater', () => {
      const task = {
        users: [{ id: 1 }, { id: 2 }],
        reviewer: { id: 5 },
      } as Task;

      const result = service.getTaskStatusUpdatedNotificationRecipients(
        task,
        1,
        'em_revisao',
      );

      expect(result).toEqual([5]);
    });

    it('should return empty array when reviewer is the updater', () => {
      const task = {
        users: [{ id: 1 }, { id: 2 }],
        reviewer: { id: 1 },
      } as Task;

      const result = service.getTaskStatusUpdatedNotificationRecipients(
        task,
        1,
        'em_revisao',
      );

      expect(result).toEqual([]);
    });

    it('should return empty array when no reviewer and status is em_revisao', () => {
      const task = {
        users: [{ id: 1 }, { id: 2 }],
      } as Task;

      const result = service.getTaskStatusUpdatedNotificationRecipients(
        task,
        1,
        'em_revisao',
      );

      expect(result).toEqual([]);
    });

    it('should use task_reviewer_id when reviewer object is not present', () => {
      const task = {
        users: [{ id: 1 }, { id: 2 }],
        task_reviewer_id: 10,
      } as Task;

      const result = service.getTaskStatusUpdatedNotificationRecipients(
        task,
        1,
        'em_revisao',
      );

      expect(result).toEqual([10]);
    });

    it('should return assigned users excluding updater for non-review status', () => {
      const task = {
        users: [{ id: 1 }, { id: 2 }, { id: 3 }],
      } as Task;

      const result = service.getTaskStatusUpdatedNotificationRecipients(
        task,
        1,
        'em_andamento',
      );

      expect(result).toEqual([2, 3]);
    });
  });

  describe('getTaskUpdatedNotificationRecipients', () => {
    it('should return assigned user ids excluding updater', () => {
      const task = {
        users: [{ id: 1 }, { id: 2 }, { id: 3 }],
      } as Task;

      const result = service.getTaskUpdatedNotificationRecipients(task, 2);

      expect(result).toEqual([1, 3]);
    });

    it('should return empty array when no users assigned', () => {
      const task = { users: [] } as Task;

      const result = service.getTaskUpdatedNotificationRecipients(task, 1);

      expect(result).toEqual([]);
    });

    it('should return empty array when users is undefined', () => {
      const task = {} as Task;

      const result = service.getTaskUpdatedNotificationRecipients(task, 1);

      expect(result).toEqual([]);
    });
  });
});
