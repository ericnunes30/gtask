import { 
  TaskCreatedStrategy, 
  TaskStatusUpdatedStrategy, 
  CommentCreatedStrategy, 
  TaskUpdatedStrategy,
  TimerStartedStrategy,
  TimerPausedStrategy
} from '../../src/modules/notification/factories/strategies';
import { 
  NotificationType, 
  NotificationPriority, 
  NotificationCategory,
  Performer,
  TaskCreatedPayload,
  TaskStatusUpdatedPayload,
  CommentCreatedPayload,
  TimerEventPayload
} from '../../src/modules/notification/interfaces/notification.types';

describe('Notification Strategies', () => {
  let taskCreatedStrategy: TaskCreatedStrategy;
  let taskStatusUpdatedStrategy: TaskStatusUpdatedStrategy;
  let commentCreatedStrategy: CommentCreatedStrategy;
  let taskUpdatedStrategy: TaskUpdatedStrategy;
  let timerStartedStrategy: TimerStartedStrategy;
  let timerPausedStrategy: TimerPausedStrategy;

  beforeEach(() => {
    taskCreatedStrategy = new TaskCreatedStrategy();
    taskStatusUpdatedStrategy = new TaskStatusUpdatedStrategy();
    commentCreatedStrategy = new CommentCreatedStrategy();
    taskUpdatedStrategy = new TaskUpdatedStrategy();
    timerStartedStrategy = new TimerStartedStrategy();
    timerPausedStrategy = new TimerPausedStrategy();
  });

  describe('TaskCreatedStrategy', () => {
    describe('validate', () => {
      it('should return true for valid payload', () => {
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

        const result = taskCreatedStrategy.validate(payload);
        expect(result).toBeTruthy();
      });

      it('should return false when task is missing', () => {
        const payload = {
          createdBy: 1,
          performer: {
            id: 1,
            name: 'João Silva'
          }
        };

        const result = taskCreatedStrategy.validate(payload);
        expect(result).toBeFalsy();
      });

      it('should return false when task.id is missing', () => {
        const payload = {
          task: {
            title: 'Nova tarefa',
            status: 'pendente',
            priority: 'media'
          },
          createdBy: 1
        };

        const result = taskCreatedStrategy.validate(payload);
        expect(result).toBeFalsy();
      });

      it('should return false when task.title is missing', () => {
        const payload = {
          task: {
            id: 1,
            status: 'pendente',
            priority: 'media'
          },
          createdBy: 1
        };

        const result = taskCreatedStrategy.validate(payload);
        expect(result).toBeFalsy();
      });

      it('should return false when createdBy is missing', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Nova tarefa',
            status: 'pendente',
            priority: 'media'
          }
        };

        const result = taskCreatedStrategy.validate(payload);
        expect(result).toBeFalsy();
      });

      it('should return false when createdBy is not a number', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Nova tarefa',
            status: 'pendente',
            priority: 'media'
          },
          createdBy: 'invalid' as any
        };

        const result = taskCreatedStrategy.validate(payload);
        expect(result).toBeFalsy();
      });

      it('should return true for minimal valid payload', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Nova tarefa'
          },
          createdBy: 1
        };

        const result = taskCreatedStrategy.validate(payload);
        expect(result).toBeTruthy();
      });

      it('should return false for null payload', () => {
        const result = taskCreatedStrategy.validate(null);
        expect(result).toBeFalsy();
      });

      it('should return false for undefined payload', () => {
        const result = taskCreatedStrategy.validate(undefined);
        expect(result).toBeFalsy();
      });
    });

    describe('create', () => {
      it('should create notification with correct data structure', () => {
        const payload: TaskCreatedPayload = {
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
            name: 'João Silva',
            email: 'joao@example.com'
          }
        };

        const notification = taskCreatedStrategy.create(payload);

        expect(notification.type).toBe(NotificationType.TASK_CREATED);
        expect(notification.userId).toBe(1);
        expect(notification.priority).toBe(NotificationPriority.MEDIUM);
        expect(notification.data).toEqual({
          actorName: 'João Silva',
          taskTitle: 'Nova tarefa',
          taskId: 1,
          projectTitle: 'Projeto A'
        });
        expect(notification.metadata).toEqual({
          source: 'task_system',
          category: 'task' as any,
          tags: ['task', 'created', 'project'],
          version: '1.0'
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
          taskId: 1,
          projectTitle: undefined
        });
      });

      it('should handle task without project', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Nova tarefa sem projeto',
            status: 'pendente',
            priority: 'media'
          },
          createdBy: 1,
          performer: {
            id: 1,
            name: 'João Silva'
          }
        };

        const notification = taskCreatedStrategy.create(payload);

        expect(notification.metadata.tags).toEqual(['task', 'created']);
        expect(notification.data.projectTitle).toBeUndefined();
      });

      it('should throw error when payload validation fails', () => {
        const invalidPayload = {
          task: {
            title: 'Tarefa sem id'
          },
          createdBy: 1
        };

        expect(() => taskCreatedStrategy.create(invalidPayload))
          .toThrow('Invalid payload for TaskCreatedStrategy');
      });
    });

    describe('getPriority', () => {
      it('should return URGENT for urgente priority', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Tarefa urgente',
            priority: 'urgente'
          },
          createdBy: 1
        };

        const priority = taskCreatedStrategy.getPriority(payload);
        expect(priority).toBe(NotificationPriority.URGENT);
      });

      it('should return HIGH for alta priority', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Tarefa alta',
            priority: 'alta'
          },
          createdBy: 1
        };

        const priority = taskCreatedStrategy.getPriority(payload);
        expect(priority).toBe(NotificationPriority.HIGH);
      });

      it('should return MEDIUM for media priority', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Tarefa media',
            priority: 'media'
          },
          createdBy: 1
        };

        const priority = taskCreatedStrategy.getPriority(payload);
        expect(priority).toBe(NotificationPriority.MEDIUM);
      });

      it('should return LOW for baixa priority', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Tarefa baixa',
            priority: 'baixa'
          },
          createdBy: 1
        };

        const priority = taskCreatedStrategy.getPriority(payload);
        expect(priority).toBe(NotificationPriority.LOW);
      });

      it('should return MEDIUM for unknown priority', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Tarefa desconhecida',
            priority: 'desconhecido'
          },
          createdBy: 1
        };

        const priority = taskCreatedStrategy.getPriority(payload);
        expect(priority).toBe(NotificationPriority.MEDIUM);
      });

      it('should return MEDIUM when priority is missing', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Tarefa sem prioridade'
          },
          createdBy: 1
        };

        const priority = taskCreatedStrategy.getPriority(payload);
        expect(priority).toBe(NotificationPriority.MEDIUM);
      });
    });
  });

  describe('TaskStatusUpdatedStrategy', () => {
    describe('validate', () => {
      it('should return true for valid payload', () => {
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

        const result = taskStatusUpdatedStrategy.validate(payload);
        expect(result).toBeTruthy();
      });

      it('should return false when task is missing', () => {
        const payload = {
          oldStatus: 'pendente',
          newStatus: 'em_andamento',
          updatedBy: 1
        };

        const result = taskStatusUpdatedStrategy.validate(payload);
        expect(result).toBeFalsy();
      });

      it('should return false when oldStatus is missing', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Tarefa atualizada'
          },
          newStatus: 'em_andamento',
          updatedBy: 1
        };

        const result = taskStatusUpdatedStrategy.validate(payload);
        expect(result).toBeFalsy();
      });

      it('should return false when newStatus is missing', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Tarefa atualizada'
          },
          oldStatus: 'pendente',
          updatedBy: 1
        };

        const result = taskStatusUpdatedStrategy.validate(payload);
        expect(result).toBeFalsy();
      });

      it('should return false when updatedBy is missing', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Tarefa atualizada'
          },
          oldStatus: 'pendente',
          newStatus: 'em_andamento'
        };

        const result = taskStatusUpdatedStrategy.validate(payload);
        expect(result).toBeFalsy();
      });
    });

    describe('create', () => {
      it('should create notification with correct data structure', () => {
        const payload: TaskStatusUpdatedPayload = {
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
          taskId: 1,
          oldStatus: 'pendente',
          newStatus: 'em_andamento'
        });
        expect(notification.metadata).toEqual({
          source: 'task_system',
          category: 'task' as any,
          tags: ['task', 'status_updated', 'project'],
          version: '1.0'
        });
      });

      it('should handle task without project', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Tarefa sem projeto'
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

        expect(notification.metadata.tags).toEqual(['task', 'status_updated']);
      });
    });

    describe('getPriority', () => {
      it('should return HIGH for concluido status', () => {
        const payload = {
          oldStatus: 'em_andamento',
          newStatus: 'concluido'
        };

        const priority = taskStatusUpdatedStrategy.getPriority(payload);
        expect(priority).toBe(NotificationPriority.HIGH);
      });

      it('should return HIGH for cancelado status', () => {
        const payload = {
          oldStatus: 'em_andamento',
          newStatus: 'cancelado'
        };

        const priority = taskStatusUpdatedStrategy.getPriority(payload);
        expect(priority).toBe(NotificationPriority.HIGH);
      });

      it('should return HIGH for em_revisao status', () => {
        const payload = {
          oldStatus: 'em_andamento',
          newStatus: 'em_revisao'
        };

        const priority = taskStatusUpdatedStrategy.getPriority(payload);
        expect(priority).toBe(NotificationPriority.HIGH);
      });

      it('should return MEDIUM for em_andamento status from pendente', () => {
        const payload = {
          oldStatus: 'pendente',
          newStatus: 'em_andamento'
        };

        const priority = taskStatusUpdatedStrategy.getPriority(payload);
        expect(priority).toBe(NotificationPriority.MEDIUM);
      });

      it('should return MEDIUM for aguardando_cliente status from pendente', () => {
        const payload = {
          oldStatus: 'pendente',
          newStatus: 'aguardando_cliente'
        };

        const priority = taskStatusUpdatedStrategy.getPriority(payload);
        expect(priority).toBe(NotificationPriority.MEDIUM);
      });

      it('should return LOW for other status changes', () => {
        const payload = {
          oldStatus: 'em_andamento',
          newStatus: 'pendente'
        };

        const priority = taskStatusUpdatedStrategy.getPriority(payload);
        expect(priority).toBe(NotificationPriority.LOW);
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
        taskId: 1,
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
        taskId: 1,
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