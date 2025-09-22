import { NotificationFactory } from '../../src/modules/notification/factories/notification.factory';
import { NotificationType, NotificationPriority, NotificationCategory } from '../../src/modules/notification/interfaces/notification.types';

// Mock das estratégias
const mockStrategies: any[] = [
  {
    type: NotificationType.TASK_CREATED,
    create: jest.fn(),
    validate: jest.fn().mockReturnValue(true),
    getPriority: jest.fn().mockReturnValue(NotificationPriority.MEDIUM)
  },
  {
    type: NotificationType.TASK_STATUS_CHANGED,
    create: jest.fn(),
    validate: jest.fn().mockReturnValue(true),
    getPriority: jest.fn().mockReturnValue(NotificationPriority.MEDIUM)
  }
];

describe('NotificationFactory', () => {
  let notificationFactory: NotificationFactory;

  beforeEach(() => {
    // Criar uma instância da fábrica com estratégias mockadas
    notificationFactory = new NotificationFactory(mockStrategies as any);
  });

  describe('validateNotification', () => {
    it('should validate notification with TaskCreatedData', () => {
      const notification: any = {
        userId: 1,
        type: NotificationType.TASK_CREATED,
        priority: NotificationPriority.MEDIUM,
        data: {
          actorName: 'João Silva',
          taskTitle: 'Nova tarefa',
          projectTitle: 'Projeto A'
        },
        metadata: {
          source: 'task_system',
          category: NotificationCategory.TASK,
          tags: ['task', 'created'],
          version: '1.0'
        }
      };

      const result = notificationFactory.validateNotification(notification);
      expect(result).toBe(true);
    });

    it('should validate notification with TaskStatusUpdatedData', () => {
      const notification: any = {
        userId: 1,
        type: NotificationType.TASK_STATUS_CHANGED,
        priority: NotificationPriority.MEDIUM,
        data: {
          actorName: 'Maria Souza',
          taskTitle: 'Tarefa atualizada',
          oldStatus: 'pendente',
          newStatus: 'em_andamento'
        },
        metadata: {
          source: 'task_system',
          category: NotificationCategory.TASK,
          tags: ['task', 'status_updated'],
          version: '1.0'
        }
      };

      const result = notificationFactory.validateNotification(notification);
      expect(result).toBe(true);
    });

    it('should validate notification with CommentCreatedData', () => {
      const notification: any = {
        userId: 1,
        type: NotificationType.COMMENT_CREATED,
        priority: NotificationPriority.MEDIUM,
        data: {
          actorName: 'Pedro Santos',
          taskTitle: 'Tarefa com comentário',
          commentSnippet: 'Este é um comentário de exemplo'
        },
        metadata: {
          source: 'comment_system',
          category: NotificationCategory.COMMENT,
          tags: ['comment', 'created'],
          version: '1.0'
        }
      };

      const result = notificationFactory.validateNotification(notification);
      expect(result).toBe(true);
    });

    it('should validate notification with TaskUpdatedData', () => {
      const notification: any = {
        userId: 1,
        type: NotificationType.TASK_UPDATED,
        priority: NotificationPriority.MEDIUM,
        data: {
          actorName: 'Ana Costa',
          taskTitle: 'Tarefa modificada',
          changedFields: [
            {
              field: 'priority',
              oldValue: 'media',
              newValue: 'alta'
            }
          ]
        },
        metadata: {
          source: 'task_system',
          category: NotificationCategory.TASK,
          tags: ['task', 'updated'],
          version: '1.0'
        }
      };

      const result = notificationFactory.validateNotification(notification);
      expect(result).toBe(true);
    });

    it('should validate notification with old data format', () => {
      const notification: any = {
        userId: 1,
        type: NotificationType.TASK_CREATED,
        priority: NotificationPriority.MEDIUM,
        data: {
          entityType: 'task',
          entityId: 1,
          action: 'created',
          changes: {
            task: {
              oldValue: null,
              newValue: {
                id: 1,
                title: 'Nova tarefa',
                status: 'pendente',
                priority: 'media'
              }
            }
          }
        },
        metadata: {
          source: 'task_system',
          category: NotificationCategory.TASK,
          tags: ['task', 'created'],
          version: '1.0'
        }
      };

      const result = notificationFactory.validateNotification(notification);
      expect(result).toBe(true);
    });

    it('should invalidate notification with missing required fields', () => {
      const notification: any = {
        // userId está faltando
        type: NotificationType.TASK_CREATED,
        priority: NotificationPriority.MEDIUM,
        data: {
          actorName: 'João Silva',
          taskTitle: 'Nova tarefa'
        },
        metadata: {
          source: 'task_system',
          category: NotificationCategory.TASK,
          tags: ['task', 'created'],
          version: '1.0'
        }
      };

      const result = notificationFactory.validateNotification(notification);
      expect(result).toBe(false);
    });

    it('should invalidate notification with invalid TaskCreatedData', () => {
      const notification: any = {
        userId: 1,
        type: NotificationType.TASK_CREATED,
        priority: NotificationPriority.MEDIUM,
        data: {
          // actorName está faltando
          taskTitle: 'Nova tarefa'
        },
        metadata: {
          source: 'task_system',
          category: NotificationCategory.TASK,
          tags: ['task', 'created'],
          version: '1.0'
        }
      };

      const result = notificationFactory.validateNotification(notification);
      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create a notification using the correct strategy', () => {
      const payload = {
        task: {
          id: 1,
          title: 'Nova tarefa',
          status: 'pendente',
          priority: 'media'
        },
        createdBy: 1
      };

      // Mock do método create da estratégia
      mockStrategies[0].create.mockReturnValue({
        id: 0,
        userId: 1,
        type: NotificationType.TASK_CREATED,
        priority: NotificationPriority.MEDIUM,
        data: {
          actorName: 'Usuário desconhecido',
          taskTitle: 'Nova tarefa'
        },
        metadata: {
          source: 'task_system',
          category: NotificationCategory.TASK,
          tags: ['task', 'created'],
          version: '1.0'
        },
        isRead: false,
        createdAt: new Date()
      });

      const result = notificationFactory.create(NotificationType.TASK_CREATED, payload);
      
      expect(mockStrategies[0].validate).toHaveBeenCalledWith(payload);
      expect(mockStrategies[0].create).toHaveBeenCalledWith(payload);
      expect(result).toBeDefined();
      expect(result.type).toBe(NotificationType.TASK_CREATED);
    });

    it('should throw an error if no strategy is found for the event type', () => {
      const payload = {};
      
      expect(() => {
        notificationFactory.create('unknown.event.type' as any, payload);
      }).toThrow('No strategy found for event type: unknown.event.type');
    });

    it('should throw an error if strategy validation fails', () => {
      const payload = {};
      
      // Mock da validação para falhar
      mockStrategies[0].validate.mockReturnValueOnce(false);
      
      expect(() => {
        notificationFactory.create(NotificationType.TASK_CREATED, payload);
      }).toThrow('Invalid payload for event type: task.created');
    });
  });
});