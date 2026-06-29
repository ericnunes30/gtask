import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLogListener } from './activity-log.listener';
import { ActivityLog } from '../entities/activity-log.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Comment } from '../../comment/entities/comment.entity';

describe('ActivityLogListener', () => {
  let listener: ActivityLogListener;
  let repository: jest.Mocked<Repository<ActivityLog>>;

  const mockRepository = {
    create: jest.fn().mockReturnValue({} as ActivityLog),
    save: jest.fn().mockResolvedValue({} as ActivityLog),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogListener,
        {
          provide: getRepositoryToken(ActivityLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    listener = module.get(ActivityLogListener);
    repository = module.get(getRepositoryToken(ActivityLog));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleTaskCreatedEvent', () => {
    const task = {
      id: 1,
      title: 'Task',
      status: 'open',
      priority: 'high',
      project_id: 1,
    } as Task;

    const payload = {
      task,
      createdBy: 1,
    };

    it('should create and save activity log on success', async () => {
      await listener.handleTaskCreatedEvent(payload);

      expect(repository.create).toHaveBeenCalledWith({
        userId: 1,
        taskId: 1,
        actionType: 'CREATE_TASK',
        newValue: 'Task',
        details: {
          title: 'Task',
          status: 'open',
          priority: 'high',
          projectId: 1,
        },
      });
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('should log error and not throw when save fails', async () => {
      const error = new Error('DB error');
      repository.save.mockRejectedValueOnce(error);

      const loggerErrorSpy = jest
        .spyOn(
          (listener as unknown as Record<string, unknown>)['logger'],
          'error',
        )
        .mockImplementation(() => {});

      await expect(
        listener.handleTaskCreatedEvent(payload),
      ).resolves.not.toThrow();

      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });
  });

  describe('handleCommentCreatedEvent', () => {
    const comment = {
      id: 1,
      task_id: 1,
      content: 'Comment',
    } as Comment;

    const payload = {
      comment,
      createdBy: 1,
    };

    it('should create and save activity log on success', async () => {
      await listener.handleCommentCreatedEvent(payload);

      expect(repository.create).toHaveBeenCalledWith({
        userId: 1,
        taskId: 1,
        actionType: 'CREATE_COMMENT',
        newValue: 'Comment',
      });
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('should log error and not throw when save fails', async () => {
      const error = new Error('DB error');
      repository.save.mockRejectedValueOnce(error);

      const loggerErrorSpy = jest
        .spyOn(
          (listener as unknown as Record<string, unknown>)['logger'],
          'error',
        )
        .mockImplementation(() => {});

      await expect(
        listener.handleCommentCreatedEvent(payload),
      ).resolves.not.toThrow();

      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });
  });

  describe('handleTaskUpdatedEvent', () => {
    const task = {
      id: 1,
      title: 'Task',
    } as Task;

    const payload = {
      task,
      updatedBy: 1,
      changedFields: {
        status: { oldValue: 'open', newValue: 'in_progress' },
        title: { oldValue: 'Old Task', newValue: 'Task' },
      },
    };

    it('should create and save activity log for each changed field on success', async () => {
      await listener.handleTaskUpdatedEvent(payload);

      expect(repository.create).toHaveBeenCalledTimes(2);
      expect(repository.create).toHaveBeenCalledWith({
        userId: 1,
        taskId: 1,
        actionType: 'TASK_UPDATED',
        changedField: 'status',
        oldValue: 'open',
        newValue: 'in_progress',
      });
      expect(repository.create).toHaveBeenCalledWith({
        userId: 1,
        taskId: 1,
        actionType: 'TASK_UPDATED',
        changedField: 'title',
        oldValue: 'Old Task',
        newValue: 'Task',
      });
      expect(repository.save).toHaveBeenCalledTimes(2);
    });

    it('should log error for each field and not throw when save fails', async () => {
      const error = new Error('DB error');
      repository.save.mockRejectedValue(error);

      const loggerErrorSpy = jest
        .spyOn(
          (listener as unknown as Record<string, unknown>)['logger'],
          'error',
        )
        .mockImplementation(() => {});

      await expect(
        listener.handleTaskUpdatedEvent(payload),
      ).resolves.not.toThrow();

      expect(repository.save).toHaveBeenCalledTimes(2);
      expect(loggerErrorSpy).toHaveBeenCalledTimes(2);

      loggerErrorSpy.mockRestore();
    });
  });

  describe('handleTaskStatusUpdatedEvent', () => {
    const task = {
      id: 1,
      title: 'Task',
    } as Task;

    const payload = {
      task,
      updatedBy: 1,
      oldStatus: 'open',
      newStatus: 'in_progress',
    };

    it('should create and save activity log on success', async () => {
      await listener.handleTaskStatusUpdatedEvent(payload);

      expect(repository.create).toHaveBeenCalledWith({
        userId: 1,
        taskId: 1,
        actionType: 'TASK_STATUS_UPDATED',
        changedField: 'status',
        oldValue: 'open',
        newValue: 'in_progress',
      });
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('should log error and not throw when save fails', async () => {
      const error = new Error('DB error');
      repository.save.mockRejectedValueOnce(error);

      const loggerErrorSpy = jest
        .spyOn(
          (listener as unknown as Record<string, unknown>)['logger'],
          'error',
        )
        .mockImplementation(() => {});

      await expect(
        listener.handleTaskStatusUpdatedEvent(payload),
      ).resolves.not.toThrow();

      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });
  });

  describe('handleTaskAssigneesUpdatedEvent', () => {
    const task = {
      id: 1,
      title: 'Task',
    } as Task;

    const payload = {
      task,
      updatedBy: 1,
      action: 'set' as const,
      userIds: [1, 2],
    };

    it('should create and save activity log on success for set action', async () => {
      await listener.handleTaskAssigneesUpdatedEvent(payload);

      expect(repository.create).toHaveBeenCalledWith({
        userId: 1,
        taskId: 1,
        actionType: 'TASK_ASSIGNEES_SET',
        newValue: JSON.stringify([1, 2]),
      });
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('should create and save activity log for remove action', async () => {
      await listener.handleTaskAssigneesUpdatedEvent({
        ...payload,
        action: 'remove' as const,
      });

      expect(repository.create).toHaveBeenCalledWith({
        userId: 1,
        taskId: 1,
        actionType: 'TASK_ASSIGNEES_REMOVED',
        newValue: JSON.stringify([1, 2]),
      });
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('should log error and not throw when save fails', async () => {
      const error = new Error('DB error');
      repository.save.mockRejectedValueOnce(error);

      const loggerErrorSpy = jest
        .spyOn(
          (listener as unknown as Record<string, unknown>)['logger'],
          'error',
        )
        .mockImplementation(() => {});

      await expect(
        listener.handleTaskAssigneesUpdatedEvent(payload),
      ).resolves.not.toThrow();

      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });
  });
});
