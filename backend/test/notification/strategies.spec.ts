import { TaskCreatedStrategy, TaskStatusUpdatedStrategy, CommentCreatedStrategy, TaskUpdatedStrategy } from '../../src/modules/notification/factories/strategies';
import { NotificationType, NotificationPriority, NotificationCategory } from '../../src/modules/notification/interfaces/notification.types';

describe('Notification Strategies', () => {
  let taskCreatedStrategy: TaskCreatedStrategy;
  let taskStatusUpdatedStrategy: TaskStatusUpdatedStrategy;
  let commentCreatedStrategy: CommentCreatedStrategy;
  let taskUpdatedStrategy: TaskUpdatedStrategy;

  beforeEach(() => {
    taskCreatedStrategy = new TaskCreatedStrategy();
    taskStatusUpdatedStrategy = new TaskStatusUpdatedStrategy();
    commentCreatedStrategy = new CommentCreatedStrategy();
    taskUpdatedStrategy = new TaskUpdatedStrategy();
  });

  describe('TaskCreatedStrategy', () => {
    it('should create notification with correct data structure', () => {
      const payload = {
        task: {
          id: 1,
          title: 'Nova tarefa',
          status: 'pendente',
          priority: 'media',
          project: {
            id: 1,
            title: 'Projeto A'
          }
        },
        createdBy: 1,
        performer: {
          id: 1,
          name: 'João Silva'
        }
      };

      const notification = taskCreatedStrategy.create(payload);

      expect(notification.type).toBe(NotificationType.TASK_CREATED);
      expect(notification.userId).toBe(1);
      expect(notification.priority).toBe(NotificationPriority.MEDIUM);
      expect(notification.data).toEqual({
        actorName: 'João Silva',
        taskTitle: 'Nova tarefa',
        projectTitle: 'Projeto A'
      });
    });

    it('should create notification with default performer name if not provided', () => {
      const payload = {
        task: {
          id: 1,
          title: 'Nova tarefa',
          status: 'pendente',
          priority: 'media'
        },
        createdBy: 1
      };

      const notification = taskCreatedStrategy.create(payload);

      expect(notification.data).toEqual({
        actorName: 'Usuário desconhecido',
        taskTitle: 'Nova tarefa',
        projectTitle: undefined
      });
    });
  });

  describe('TaskStatusUpdatedStrategy', () => {
    it('should create notification with correct data structure', () => {
      const payload = {
        task: {
          id: 1,
          title: 'Tarefa atualizada',
          project: {
            id: 1,
            title: 'Projeto A'
          }
        },
        oldStatus: 'pendente',
        newStatus: 'em_andamento',
        updatedBy: 1,
        performer: {
          id: 1,
          name: 'Maria Souza'
        }
      };

      const notification = taskStatusUpdatedStrategy.create(payload);

      expect(notification.type).toBe(NotificationType.TASK_STATUS_CHANGED);
      expect(notification.userId).toBe(1);
      expect(notification.data).toEqual({
        actorName: 'Maria Souza',
        taskTitle: 'Tarefa atualizada',
        oldStatus: 'pendente',
        newStatus: 'em_andamento'
      });
    });
  });

  describe('CommentCreatedStrategy', () => {
    it('should create notification with correct data structure', () => {
      const payload = {
        comment: {
          id: 1,
          content: 'Este é um comentário de exemplo',
          task: {
            id: 1,
            title: 'Tarefa com comentário'
          }
        },
        createdBy: 1,
        performer: {
          id: 1,
          name: 'Pedro Santos'
        }
      };

      const notification = commentCreatedStrategy.create(payload);

      expect(notification.type).toBe(NotificationType.COMMENT_CREATED);
      expect(notification.userId).toBe(1);
      expect(notification.data).toEqual({
        actorName: 'Pedro Santos',
        taskTitle: 'Tarefa com comentário',
        commentSnippet: 'Este é um comentário de exemplo'
      });
    });

    it('should truncate comment snippet if too long', () => {
      const longComment = 'a'.repeat(60);
      const payload = {
        comment: {
          id: 1,
          content: longComment,
          task: {
            id: 1,
            title: 'Tarefa com comentário longo'
          }
        },
        createdBy: 1,
        performer: {
          id: 1,
          name: 'Pedro Santos'
        }
      };

      const notification = commentCreatedStrategy.create(payload);

      expect(notification.data.commentSnippet).toBe('a'.repeat(47) + '...');
    });
  });

  describe('TaskUpdatedStrategy', () => {
    it('should create notification with correct data structure', () => {
      const payload = {
        task: {
          id: 1,
          title: 'Tarefa modificada'
        },
        updatedBy: 1,
        performer: {
          id: 1,
          name: 'Ana Costa'
        },
        changedFields: [
          {
            field: 'priority',
            oldValue: 'media',
            newValue: 'alta'
          },
          {
            field: 'due_date',
            oldValue: '2023-12-01',
            newValue: '2023-11-30'
          }
        ]
      };

      const notification = taskUpdatedStrategy.create(payload);

      expect(notification.type).toBe(NotificationType.TASK_UPDATED);
      expect(notification.userId).toBe(1);
      expect(notification.data).toEqual({
        actorName: 'Ana Costa',
        taskTitle: 'Tarefa modificada',
        changedFields: [
          {
            field: 'priority',
            oldValue: 'media',
            newValue: 'alta'
          },
          {
            field: 'due_date',
            oldValue: '2023-12-01',
            newValue: '2023-11-30'
          }
        ]
      });
    });
  });
});