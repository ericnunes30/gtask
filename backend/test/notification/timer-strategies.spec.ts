import { 
  TimerStartedStrategy, 
  TimerPausedStrategy,
  TaskCreatedStrategy,
  TaskStatusUpdatedStrategy,
  CommentCreatedStrategy,
  TaskUpdatedStrategy
} from '../../src/modules/notification/factories/strategies';
import { 
  NotificationType, 
  NotificationPriority,
  TimerEventPayload,
  Performer
} from '../../src/modules/notification/interfaces/notification.types';

describe('Timer Notification Strategies', () => {
  let timerStartedStrategy: TimerStartedStrategy;
  let timerPausedStrategy: TimerPausedStrategy;

  beforeEach(() => {
    timerStartedStrategy = new TimerStartedStrategy();
    timerPausedStrategy = new TimerPausedStrategy();
  });

  describe('TimerStartedStrategy', () => {
    describe('validate', () => {
      it('should return true for valid payload', () => {
        const payload: TimerEventPayload = {
          task: {
            id: 1,
            title: 'Test Task',
            project: {
              id: 1,
              title: 'Test Project'
            }
          },
          userId: 1,
          performer: {
            id: 1,
            name: 'Test User'
          },
          duration: 3600
        };

        const result = timerStartedStrategy.validate(payload);
        expect(result).toBeTruthy();
      });

      it('should return true for minimal valid payload', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Test Task'
          },
          userId: 1
        };

        const result = timerStartedStrategy.validate(payload);
        expect(result).toBeTruthy();
      });

      it('should return false when task is missing', () => {
        const payload = {
          userId: 1,
          duration: 3600
        };

        const result = timerStartedStrategy.validate(payload);
        expect(result).toBeFalsy();
      });

      it('should return false when task.id is missing', () => {
        const payload = {
          task: {
            title: 'Test Task'
          },
          userId: 1
        };

        const result = timerStartedStrategy.validate(payload);
        expect(result).toBeFalsy();
      });

      it('should return false when userId is missing', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Test Task'
          }
        };

        const result = timerStartedStrategy.validate(payload);
        expect(result).toBeFalsy();
      });

      it('should return false for null payload', () => {
        const result = timerStartedStrategy.validate(null);
        expect(result).toBeFalsy();
      });
    });

    describe('create', () => {
      it('should create notification with complete payload', () => {
        const payload: TimerEventPayload = {
          task: {
            id: 1,
            title: 'Test Task',
            status: 'pendente',
            priority: 'media',
            project: {
              id: 1,
              title: 'Test Project'
            }
          },
          userId: 1,
          performer: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            avatar: 'avatar.jpg'
          },
          duration: 3600
        };

        const notification = timerStartedStrategy.create(payload);

        expect(notification.type).toBe(NotificationType.TIMER_STARTED);
        expect(notification.userId).toBe(1);
        expect(notification.priority).toBe(NotificationPriority.LOW);
        
        expect(notification.data).toEqual({
          entityType: 'timer',
          entityId: 1,
          action: 'started',
          changes: {
            timer: {
              oldValue: null,
              newValue: {
                taskId: 1,
                duration: 3600,
                status: 'running'
              }
            }
          },
          relatedEntities: expect.arrayContaining([
            {
              type: 'timer',
              id: 1,
              name: 'Timer da tarefa Test Task',
              metadata: {
                taskId: 1,
                duration: 3600,
                status: 'running'
              }
            },
            {
              type: 'task',
              id: 1,
              name: 'Test Task',
              metadata: {
                status: 'pendente',
                priority: 'media'
              }
            },
            {
              type: 'project',
              id: 1,
              name: 'Test Project'
            }
          ]),
          context: {
            performer: {
              id: 1,
              name: 'Test User',
              email: 'test@example.com',
              avatar: 'avatar.jpg'
            },
            timestamp: expect.any(String),
            source: 'timer_start',
            additionalData: {
              duration: 3600
            }
          }
        });

        expect(notification.metadata).toEqual({
          source: 'timer_system',
          category: 'timer' as any,
          tags: ['timer', 'started', 'task'],
          version: '1.0'
        });
      });

      it('should create notification without project', () => {
        const payload: TimerEventPayload = {
          task: {
            id: 1,
            title: 'Test Task',
            status: 'pendente',
            priority: 'media'
          },
          userId: 1,
          performer: {
            id: 1,
            name: 'Test User'
          }
        };

        const notification = timerStartedStrategy.create(payload);

        const taskRelatedEntities = notification.data.relatedEntities?.filter(e => e.type === 'task');
        const projectRelatedEntities = notification.data.relatedEntities?.filter(e => e.type === 'project');
        
        expect(taskRelatedEntities).toHaveLength(1);
        expect(projectRelatedEntities).toHaveLength(0);
      });

      it('should create notification without performer', () => {
        const payload: TimerEventPayload = {
          task: {
            id: 1,
            title: 'Test Task'
          },
          userId: 1
        };

        const notification = timerStartedStrategy.create(payload);

        expect(notification.data.context?.performer).toBeUndefined();
      });

      it('should create notification without duration', () => {
        const payload: TimerEventPayload = {
          task: {
            id: 1,
            title: 'Test Task'
          },
          userId: 1,
          performer: {
            id: 1,
            name: 'Test User'
          }
        };

        const notification = timerStartedStrategy.create(payload);

        expect(notification.data.context?.additionalData?.duration).toBeUndefined();
      });

      it('should throw error when validation fails', () => {
        const invalidPayload = {
          task: {
            title: 'Test Task'
          },
          userId: 1
        };

        expect(() => timerStartedStrategy.create(invalidPayload))
          .toThrow('Invalid payload for TimerStartedStrategy');
      });
    });

    describe('getPriority', () => {
      it('should always return LOW', () => {
        const payload: TimerEventPayload = {
          task: {
            id: 1,
            title: 'Test Task'
          },
          userId: 1
        };

        const priority = timerStartedStrategy.getPriority(payload);
        expect(priority).toBe(NotificationPriority.LOW);
      });

      it('should return LOW even with high priority task', () => {
        const payload: TimerEventPayload = {
          task: {
            id: 1,
            title: 'Urgent Task',
            priority: 'urgente'
          },
          userId: 1
        };

        const priority = timerStartedStrategy.getPriority(payload);
        expect(priority).toBe(NotificationPriority.LOW);
      });
    });
  });

  describe('TimerPausedStrategy', () => {
    describe('validate', () => {
      it('should return true for valid payload', () => {
        const payload: TimerEventPayload = {
          task: {
            id: 1,
            title: 'Test Task'
          },
          userId: 1,
          duration: 3600
        };

        const result = timerPausedStrategy.validate(payload);
        expect(result).toBeTruthy();
      });

      it('should return true for minimal valid payload', () => {
        const payload = {
          task: {
            id: 1,
            title: 'Test Task'
          },
          userId: 1
        };

        const result = timerPausedStrategy.validate(payload);
        expect(result).toBeTruthy();
      });

      it('should return false when required fields are missing', () => {
        const payload = {
          userId: 1
        };

        const result = timerPausedStrategy.validate(payload);
        expect(result).toBeFalsy();
      });
    });

    describe('create', () => {
      it('should create notification with complete payload', () => {
        const payload: TimerEventPayload = {
          task: {
            id: 1,
            title: 'Test Task',
            project: {
              id: 1,
              title: 'Test Project'
            }
          },
          userId: 1,
          performer: {
            id: 1,
            name: 'Test User'
          },
          duration: 3600
        };

        const notification = timerPausedStrategy.create(payload);

        expect(notification.type).toBe(NotificationType.TIMER_PAUSED);
        expect(notification.userId).toBe(1);
        expect(notification.priority).toBe(NotificationPriority.LOW);
        
        expect(notification.data).toEqual({
          entityType: 'timer',
          entityId: 1,
          action: 'paused',
          changes: {
            timer: {
              oldValue: {
                taskId: 1,
                status: 'running'
              },
              newValue: {
                taskId: 1,
                duration: 3600,
                status: 'paused'
              }
            }
          },
          relatedEntities: expect.arrayContaining([
            {
              type: 'timer',
              id: 1,
              name: 'Timer da tarefa Test Task',
              metadata: {
                taskId: 1,
                duration: 3600,
                status: 'paused'
              }
            }
          ]),
          context: {
            performer: {
              id: 1,
              name: 'Test User'
            },
            timestamp: expect.any(String),
            source: 'timer_pause',
            additionalData: {
              duration: 3600
            }
          }
        });

        expect(notification.metadata).toEqual({
          source: 'timer_system',
          category: 'timer' as any,
          tags: ['timer', 'paused', 'task'],
          version: '1.0'
        });
      });

      it('should create notification without duration', () => {
        const payload: TimerEventPayload = {
          task: {
            id: 1,
            title: 'Test Task'
          },
          userId: 1,
          performer: {
            id: 1,
            name: 'Test User'
          }
        };

        const notification = timerPausedStrategy.create(payload);

        expect(notification.data.context?.additionalData?.duration).toBeUndefined();
      });
    });

    describe('getPriority', () => {
      it('should always return LOW', () => {
        const payload: TimerEventPayload = {
          task: {
            id: 1,
            title: 'Test Task'
          },
          userId: 1
        };

        const priority = timerPausedStrategy.getPriority(payload);
        expect(priority).toBe(NotificationPriority.LOW);
      });
    });
  });

  describe('Strategy Integration', () => {
    let strategies: any[];

    beforeEach(() => {
      strategies = [
        new TaskCreatedStrategy(),
        new TaskStatusUpdatedStrategy(),
        new CommentCreatedStrategy(),
        new TaskUpdatedStrategy(),
        new TimerStartedStrategy(),
        new TimerPausedStrategy()
      ];
    });

    it('should have unique types for all strategies', () => {
      const types = strategies.map(s => s.type);
      const uniqueTypes = new Set(types);
      
      expect(types.length).toBe(uniqueTypes.size);
      expect(types).toContain(NotificationType.TASK_CREATED);
      expect(types).toContain(NotificationType.TASK_STATUS_CHANGED);
      expect(types).toContain(NotificationType.COMMENT_CREATED);
      expect(types).toContain(NotificationType.TASK_UPDATED);
      expect(types).toContain(NotificationType.TIMER_STARTED);
      expect(types).toContain(NotificationType.TIMER_PAUSED);
    });

    it('should all strategies implement required interface methods', () => {
      strategies.forEach(strategy => {
        expect(typeof strategy.validate).toBe('function');
        expect(typeof strategy.create).toBe('function');
        expect(typeof strategy.getPriority).toBe('function');
        expect(typeof strategy.type).toBe('string');
        expect(Object.values(NotificationType)).toContain(strategy.type);
      });
    });

    it('should validate all strategies with valid payloads', () => {
      const validPayloads = [
        {
          task: { id: 1, title: 'Test' },
          createdBy: 1
        },
        {
          task: { id: 1, title: 'Test' },
          oldStatus: 'pendente',
          newStatus: 'em_andamento',
          updatedBy: 1
        },
        {
          comment: { id: 1, content: 'Test', task: { id: 1, title: 'Test' } },
          createdBy: 1
        },
        {
          task: { id: 1, title: 'Test' },
          updatedBy: 1,
          changedFields: [{ field: 'test', oldValue: 'old', newValue: 'new' }]
        },
        {
          task: { id: 1, title: 'Test' },
          userId: 1
        },
        {
          task: { id: 1, title: 'Test' },
          userId: 1
        }
      ];

      strategies.forEach((strategy, index) => {
        const result = strategy.validate(validPayloads[index]);
        expect(result).toBeTruthy();
      });
    });

    it('should reject invalid payloads for all strategies', () => {
      const invalidPayloads = [
        {}, // TaskCreated - missing task and createdBy
        {}, // TaskStatusUpdated - missing all required fields
        {}, // CommentCreated - missing comment and createdBy
        {}, // TaskUpdated - missing all required fields
        {}, // TimerStarted - missing task and userId
        {}  // TimerPaused - missing task and userId
      ];

      strategies.forEach((strategy, index) => {
        const result = strategy.validate(invalidPayloads[index]);
        expect(result).toBeFalsy();
      });
    });

    it('should create notifications for all strategies with valid payloads', () => {
      const validPayloads = [
        {
          task: { id: 1, title: 'Test Task' },
          createdBy: 1
        },
        {
          task: { id: 1, title: 'Test Task' },
          oldStatus: 'pendente',
          newStatus: 'em_andamento',
          updatedBy: 1
        },
        {
          comment: { id: 1, content: 'Test comment', task: { id: 1, title: 'Test Task' } },
          createdBy: 1
        },
        {
          task: { id: 1, title: 'Test Task' },
          updatedBy: 1,
          changedFields: [{ field: 'priority', oldValue: 'media', newValue: 'alta' }]
        },
        {
          task: { id: 1, title: 'Test Task' },
          userId: 1
        },
        {
          task: { id: 1, title: 'Test Task' },
          userId: 1
        }
      ];

      strategies.forEach((strategy, index) => {
        const notification = strategy.create(validPayloads[index]);
        
        expect(notification).toBeDefined();
        expect(notification.id).toBe(0);
        expect(notification.type).toBe(strategy.type);
        expect(notification.isRead).toBe(false);
        expect(notification.createdAt).toBeInstanceOf(Date);
        expect(notification.metadata.source).toBeDefined();
        expect(notification.metadata.category).toBeDefined();
        expect(notification.metadata.tags).toBeDefined();
        expect(notification.metadata.version).toBeDefined();
      });
    });

    it('should return valid priorities for all strategies', () => {
      const testPayloads = [
        { task: { id: 1, title: 'Test', priority: 'alta' }, createdBy: 1 },
        { oldStatus: 'pendente', newStatus: 'concluido' },
        { comment: { id: 1, content: 'Test', task: { id: 1, title: 'Test' } }, createdBy: 1 },
        { task: { id: 1, title: 'Test' }, updatedBy: 1, changedFields: [] },
        { task: { id: 1, title: 'Test' }, userId: 1 },
        { task: { id: 1, title: 'Test' }, userId: 1 }
      ];

      strategies.forEach((strategy, index) => {
        const priority = strategy.getPriority(testPayloads[index]);
        expect(Object.values(NotificationPriority)).toContain(priority);
      });
    });
  });
});