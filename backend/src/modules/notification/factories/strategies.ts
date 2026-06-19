import { Injectable, Logger } from '@nestjs/common';
import { 
  StructuredNotification, 
  NotificationStrategy, 
  NotificationPriority,
  TaskCreatedPayload,
  TaskStatusUpdatedPayload,
  CommentCreatedPayload,
  TimerEventPayload,
  NotificationType,
  NotificationCategory
} from '../interfaces/notification.types';

export abstract class BaseNotificationStrategy implements NotificationStrategy {
  protected readonly logger = new Logger(this.constructor.name);
  abstract readonly type: NotificationType;

  abstract create(payload: any): StructuredNotification;
  abstract validate(payload: any): boolean;
  abstract getPriority(payload: any): NotificationPriority;

  protected createBaseNotification(
    type: any,
    priority: NotificationPriority,
    data: any,
    metadata: any,
    userId: number
  ): StructuredNotification {
    return {
      id: 0,
      type,
      priority,
      data,
      metadata,
      isRead: false,
      createdAt: new Date(),
      userId,
    };
  }

  protected createTaskRelatedEntities(
    task: any,
    performer?: any
  ): any[] {
    const entities: any[] = [
      {
        type: 'task',
        id: task.id,
        name: task.title,
        metadata: {
          status: task.status,
          priority: task.priority
        }
      }
    ];

    if (task.project) {
      entities.push({
        type: 'project',
        id: task.project.id,
        name: task.project.title
      });
    }

    return entities;
  }

  protected createNotificationContext(
    performer: any,
    source: string,
    additionalData?: Record<string, any>
  ): any {
    return {
      performer: performer ? {
        id: performer.id,
        name: performer.name,
        email: performer.email,
        avatar: performer.avatar
      } : undefined,
      timestamp: new Date().toISOString(),
      source,
      additionalData
    };
  }

  protected createTaskMetadata(
    tags: string[] = []
  ): any {
    return {
      source: 'task_system',
      category: 'task' as any,
      tags: ['task', ...tags],
      version: '1.0'
    };
  }
}

@Injectable()
export class TaskCreatedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TASK_CREATED;

  validate(payload: any): boolean {
    return payload && 
           payload.task && 
           payload.task.id && 
           payload.task.title &&
           payload.createdBy &&
           typeof payload.createdBy === 'number';
  }

  create(payload: TaskCreatedPayload): StructuredNotification {
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for TaskCreatedStrategy');
    }

    const { task, createdBy, performer } = payload;

    // Nova estrutura de dados proposta
    const data = {
      actorName: performer?.name || 'Usuário desconhecido',
      taskTitle: task.title,
      taskId: task.id,
      projectTitle: task.project?.title
    };

    const metadata = this.createTaskMetadata(['created']);
    if (task.project) {
      metadata.tags.push('project');
    }

    return this.createBaseNotification(
      this.type,
      this.getPriority(payload),
      data,
      metadata,
      createdBy
    );
  }

  getPriority(payload: TaskCreatedPayload): NotificationPriority {
    // Prioridade baseada na urgência da tarefa
    const priorityMap: Record<string, NotificationPriority> = {
      'urgente': NotificationPriority.URGENT,
      'alta': NotificationPriority.HIGH,
      'media': NotificationPriority.MEDIUM,
      'baixa': NotificationPriority.LOW
    };
    
    return priorityMap[payload.task.priority] || NotificationPriority.MEDIUM;
  }
}

@Injectable()
export class TaskStatusUpdatedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TASK_STATUS_CHANGED;

  validate(payload: any): boolean {
    return payload && 
           payload.task && 
           payload.task.id && 
           payload.oldStatus &&
           payload.newStatus &&
           payload.updatedBy;
  }

  create(payload: TaskStatusUpdatedPayload): StructuredNotification {
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for TaskStatusUpdatedStrategy');
    }

    const { task, oldStatus, newStatus, updatedBy, performer } = payload;

    // Nova estrutura de dados proposta
    const data = {
      actorName: performer?.name || 'Usuário desconhecido',
      taskTitle: task.title,
      taskId: task.id,
      oldStatus: oldStatus,
      newStatus: newStatus
    };

    const metadata = this.createTaskMetadata(['status_updated']);
    if (task.project) {
      metadata.tags.push('project');
    }

    return this.createBaseNotification(
      this.type,
      this.getPriority({oldStatus, newStatus}),
      data,
      metadata,
      updatedBy
    );
  }

  getPriority(payload: {oldStatus: string, newStatus: string}): NotificationPriority {
    // Prioridade alta para mudanças críticas de status
    const criticalStatuses = ['concluido', 'cancelado', 'em_revisao'];
    const mediumStatuses = ['em_andamento', 'aguardando_cliente'];
    
    if (criticalStatuses.includes(payload.newStatus)) {
      return NotificationPriority.HIGH;
    }
    
    if (mediumStatuses.includes(payload.newStatus) && payload.oldStatus === 'pendente') {
      return NotificationPriority.MEDIUM;
    }
    
    return NotificationPriority.LOW;
  }
}

@Injectable()
export class CommentCreatedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.COMMENT_CREATED;

  validate(payload: any): boolean {
    return payload && 
           payload.comment && 
           payload.comment.id && 
           payload.comment.content &&
           payload.comment.task &&
           payload.createdBy;
  }

  create(payload: CommentCreatedPayload): StructuredNotification {
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for CommentCreatedStrategy');
    }

    const { comment, createdBy, performer } = payload;

    // Nova estrutura de dados proposta
    const data = {
      actorName: performer?.name || 'Usuário desconhecido',
      taskTitle: comment.task.title,
      taskId: comment.task.id,
      commentSnippet: comment.content.length > 50 ?
        comment.content.substring(0, 47) + '...' :
        comment.content
    };

    const metadata = {
      source: 'comment_system',
      category: NotificationCategory.COMMENT,
      tags: ['comment', 'created', 'task'],
      version: '1.0'
    };

    return this.createBaseNotification(
      this.type,
      this.getPriority(payload),
      data,
      metadata,
      createdBy
    );
  }

  getPriority(payload: CommentCreatedPayload): NotificationPriority {
    // Comentários geralmente têm prioridade média
    return NotificationPriority.MEDIUM;
  }
}

@Injectable()
export class TimerStartedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TIMER_STARTED;

  validate(payload: any): boolean {
    return payload && 
           payload.task && 
           payload.task.id && 
           payload.userId;
  }

  create(payload: TimerEventPayload): StructuredNotification {
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for TimerStartedStrategy');
    }

    const { task, userId, performer, duration } = payload;

    const data = {
      entityType: 'timer',
      entityId: task.id, // Usando task.id como entityId para timer
      action: 'started',
      changes: {
        timer: {
          oldValue: null,
          newValue: {
            taskId: task.id,
            duration: duration || 0,
            status: 'running'
          }
        }
      },
      relatedEntities: [
        {
          type: 'timer',
          id: task.id,
          name: `Timer da tarefa ${task.title}`,
          metadata: {
            taskId: task.id,
            duration: duration || 0,
            status: 'running'
          }
        },
        ...this.createTaskRelatedEntities(task, performer)
      ],
      context: this.createNotificationContext(performer, 'timer_start', {
        duration
      })
    };

    const metadata = {
      source: 'timer_system',
      category: NotificationCategory.TIMER,
      tags: ['timer', 'started', 'task'],
      version: '1.0'
    };

    return this.createBaseNotification(
      this.type,
      this.getPriority(payload),
      data,
      metadata,
      userId
    );
  }

  getPriority(payload: TimerEventPayload): NotificationPriority {
    return NotificationPriority.LOW;
  }
}

@Injectable()
export class TimerPausedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TIMER_PAUSED;

  validate(payload: any): boolean {
    return payload && 
           payload.task && 
           payload.task.id && 
           payload.userId;
  }

  create(payload: TimerEventPayload): StructuredNotification {
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for TimerPausedStrategy');
    }

    const { task, userId, performer, duration } = payload;

    const data = {
      entityType: 'timer',
      entityId: task.id, // Usando task.id como entityId para timer
      action: 'paused',
      changes: {
        timer: {
          oldValue: {
            taskId: task.id,
            status: 'running'
          },
          newValue: {
            taskId: task.id,
            duration: duration || 0,
            status: 'paused'
          }
        }
      },
      relatedEntities: [
        {
          type: 'timer',
          id: task.id,
          name: `Timer da tarefa ${task.title}`,
          metadata: {
            taskId: task.id,
            duration: duration || 0,
            status: 'paused'
          }
        },
        ...this.createTaskRelatedEntities(task, performer)
      ],
      context: this.createNotificationContext(performer, 'timer_pause', {
        duration
      })
    };

    const metadata = {
      source: 'timer_system',
      category: NotificationCategory.TIMER,
      tags: ['timer', 'paused', 'task'],
      version: '1.0'
    };

    return this.createBaseNotification(
      this.type,
      this.getPriority(payload),
      data,
      metadata,
      userId
    );
  }

  getPriority(payload: TimerEventPayload): NotificationPriority {
    return NotificationPriority.LOW;
  }
}

@Injectable()
export class TaskUpdatedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TASK_UPDATED;

  validate(payload: any): boolean {
    return payload && 
           payload.task && 
           payload.task.id && 
           payload.task.title &&
           payload.updatedBy &&
           typeof payload.updatedBy === 'number' &&
           Array.isArray(payload.changedFields);
  }

  create(payload: any): StructuredNotification {
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for TaskUpdatedStrategy');
    }

    const { task, updatedBy, performer, changedFields } = payload;

    // Nova estrutura de dados proposta
    const data = {
      actorName: performer?.name || 'Usuário desconhecido',
      taskTitle: task.title,
      taskId: task.id,
      changedFields: changedFields.map((field: any) => ({
        field: field.field,
        oldValue: field.oldValue,
        newValue: field.newValue
      }))
    };

    const metadata = {
      source: 'task_system',
      category: NotificationCategory.TASK,
      tags: ['task', 'updated'],
      version: '1.0'
    };

    return this.createBaseNotification(
      this.type,
      NotificationPriority.MEDIUM, // Prioridade padrão para atualizações
      data,
      metadata,
      updatedBy
    );
  }

  getPriority(payload: any): NotificationPriority {
    // Prioridade pode ser ajustada com base nos campos alterados
    return NotificationPriority.MEDIUM;
  }
}

