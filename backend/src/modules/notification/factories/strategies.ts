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
  NotificationCategory,
  NotificationMetadata,
  RelatedEntity,
  NotificationContext,
  Performer,
} from '../interfaces/notification.types';

/**
 * Tipo do payload usado pela interface NotificationStrategy.
 * Estrategias concretas usam tipos mais especificos via cast interno.
 */
export type NotificationPayload = Record<string, unknown>;

/**
 * Tipo do `task` dentro dos payloads - aceita project opcional e demais campos.
 */
interface TaskLite {
  id: number;
  title: string;
  status?: string;
  priority?: string;
  project?: { id: number; title: string };
}

interface TaskUpdatedChangeField {
  field: string;
  oldValue: string;
  newValue: string;
}

interface TaskUpdatedPayloadShape {
  task: TaskLite;
  updatedBy: number;
  performer?: Performer;
  changedFields: TaskUpdatedChangeField[];
}

export abstract class BaseNotificationStrategy implements NotificationStrategy {
  protected readonly logger = new Logger(this.constructor.name);
  abstract readonly type: NotificationType;

  abstract create(payload: NotificationPayload): StructuredNotification;
  abstract validate(payload: NotificationPayload): boolean;
  abstract getPriority(payload: NotificationPayload): NotificationPriority;

  protected createBaseNotification(
    type: NotificationType,
    priority: NotificationPriority,
    data: StructuredNotification['data'],
    metadata: NotificationMetadata,
    userId: number,
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
    task: TaskLite,
    _performer?: unknown,
  ): RelatedEntity[] {
    const entities: RelatedEntity[] = [
      {
        type: 'task',
        id: task.id,
        name: task.title,
        metadata: {
          status: task.status,
          priority: task.priority,
        },
      },
    ];

    if (task.project) {
      entities.push({
        type: 'project',
        id: task.project.id,
        name: task.project.title,
      });
    }

    return entities;
  }

  protected createNotificationContext(
    performer: unknown,
    source: string,
    additionalData?: Record<string, unknown>,
  ): NotificationContext {
    const p = performer as Performer | undefined;
    return {
      performer: p
        ? {
            id: p.id,
            name: p.name,
            email: p.email,
            avatar: p.avatar,
          }
        : undefined,
      timestamp: new Date().toISOString(),
      source,
      additionalData,
    };
  }

  protected createTaskMetadata(tags: string[] = []): NotificationMetadata {
    return {
      source: 'task_system',
      category: NotificationCategory.TASK,
      tags: ['task', ...tags],
      version: '1.0',
    };
  }
}

@Injectable()
export class TaskCreatedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TASK_CREATED;

  validate(payload: NotificationPayload): boolean {
    const p = payload as Partial<TaskCreatedPayload>;
    return (
      !!p &&
      !!p.task &&
      !!p.task.id &&
      !!p.task.title &&
      !!p.createdBy &&
      typeof p.createdBy === 'number'
    );
  }

  create(payload: NotificationPayload): StructuredNotification {
    const p = payload as unknown as TaskCreatedPayload;
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for TaskCreatedStrategy');
    }

    const { task, createdBy, performer } = p;

    const data = {
      actorName: performer?.name || 'Usuário desconhecido',
      taskTitle: task.title,
      taskId: task.id,
      projectTitle: task.project?.title,
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
      createdBy,
    );
  }

  getPriority(payload: NotificationPayload): NotificationPriority {
    const p = payload as unknown as TaskCreatedPayload;
    const priorityMap: Record<string, NotificationPriority> = {
      urgente: NotificationPriority.URGENT,
      alta: NotificationPriority.HIGH,
      media: NotificationPriority.MEDIUM,
      baixa: NotificationPriority.LOW,
    };

    return priorityMap[p.task.priority] || NotificationPriority.MEDIUM;
  }
}

@Injectable()
export class TaskStatusUpdatedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TASK_STATUS_CHANGED;

  validate(payload: NotificationPayload): boolean {
    const p = payload as Partial<TaskStatusUpdatedPayload>;
    return (
      !!p &&
      !!p.task &&
      !!p.task.id &&
      !!p.oldStatus &&
      !!p.newStatus &&
      !!p.updatedBy
    );
  }

  create(payload: NotificationPayload): StructuredNotification {
    const p = payload as unknown as TaskStatusUpdatedPayload;
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for TaskStatusUpdatedStrategy');
    }

    const { task, oldStatus, newStatus, updatedBy, performer } = p;

    const data = {
      actorName: performer?.name || 'Usuário desconhecido',
      taskTitle: task.title,
      taskId: task.id,
      oldStatus,
      newStatus,
    };

    const metadata = this.createTaskMetadata(['status_updated']);
    if (task.project) {
      metadata.tags.push('project');
    }

    return this.createBaseNotification(
      this.type,
      this.getPriority({ oldStatus, newStatus } as NotificationPayload),
      data,
      metadata,
      updatedBy,
    );
  }

  getPriority(payload: NotificationPayload): NotificationPriority {
    const p = payload as { oldStatus: string; newStatus: string };
    const criticalStatuses = ['concluido', 'cancelado', 'em_revisao'];
    const mediumStatuses = ['em_andamento', 'aguardando_cliente'];

    if (criticalStatuses.includes(p.newStatus)) {
      return NotificationPriority.HIGH;
    }

    if (mediumStatuses.includes(p.newStatus) && p.oldStatus === 'pendente') {
      return NotificationPriority.MEDIUM;
    }

    return NotificationPriority.LOW;
  }
}

@Injectable()
export class CommentCreatedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.COMMENT_CREATED;

  validate(payload: NotificationPayload): boolean {
    const p = payload as Partial<CommentCreatedPayload>;
    return (
      !!p &&
      !!p.comment &&
      !!p.comment.id &&
      !!p.comment.content &&
      !!p.comment.task &&
      !!p.createdBy
    );
  }

  create(payload: NotificationPayload): StructuredNotification {
    const p = payload as unknown as CommentCreatedPayload;
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for CommentCreatedStrategy');
    }

    const { comment, createdBy, performer } = p;

    const data = {
      actorName: performer?.name || 'Usuário desconhecido',
      taskTitle: comment.task.title,
      taskId: comment.task.id,
      commentSnippet:
        comment.content.length > 50
          ? comment.content.substring(0, 47) + '...'
          : comment.content,
    };

    const metadata: NotificationMetadata = {
      source: 'comment_system',
      category: NotificationCategory.COMMENT,
      tags: ['comment', 'created', 'task'],
      version: '1.0',
    };

    return this.createBaseNotification(
      this.type,
      this.getPriority(payload),
      data,
      metadata,
      createdBy,
    );
  }

  getPriority(_payload: NotificationPayload): NotificationPriority {
    return NotificationPriority.MEDIUM;
  }
}

@Injectable()
export class TimerStartedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TIMER_STARTED;

  validate(payload: NotificationPayload): boolean {
    const p = payload as Partial<TimerEventPayload>;
    return !!p && !!p.task && !!p.task.id && !!p.userId;
  }

  create(payload: NotificationPayload): StructuredNotification {
    const p = payload as unknown as TimerEventPayload;
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for TimerStartedStrategy');
    }

    const { task, userId, performer, duration } = p;

    const data = {
      entityType: 'timer',
      entityId: task.id,
      action: 'started',
      changes: {
        timer: {
          oldValue: null,
          newValue: {
            taskId: task.id,
            duration: duration || 0,
            status: 'running',
          },
        },
      },
      relatedEntities: [
        {
          type: 'timer',
          id: task.id,
          name: `Timer da tarefa ${task.title}`,
          metadata: {
            taskId: task.id,
            duration: duration || 0,
            status: 'running',
          },
        },
        ...this.createTaskRelatedEntities(task, performer),
      ],
      context: this.createNotificationContext(performer, 'timer_start', {
        duration,
      }),
    };

    const metadata: NotificationMetadata = {
      source: 'timer_system',
      category: NotificationCategory.TIMER,
      tags: ['timer', 'started', 'task'],
      version: '1.0',
    };

    return this.createBaseNotification(
      this.type,
      this.getPriority(payload),
      data,
      metadata,
      userId,
    );
  }

  getPriority(_payload: NotificationPayload): NotificationPriority {
    return NotificationPriority.LOW;
  }
}

@Injectable()
export class TimerPausedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TIMER_PAUSED;

  validate(payload: NotificationPayload): boolean {
    const p = payload as Partial<TimerEventPayload>;
    return !!p && !!p.task && !!p.task.id && !!p.userId;
  }

  create(payload: NotificationPayload): StructuredNotification {
    const p = payload as unknown as TimerEventPayload;
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for TimerPausedStrategy');
    }

    const { task, userId, performer, duration } = p;

    const data = {
      entityType: 'timer',
      entityId: task.id,
      action: 'paused',
      changes: {
        timer: {
          oldValue: {
            taskId: task.id,
            status: 'running',
          },
          newValue: {
            taskId: task.id,
            duration: duration || 0,
            status: 'paused',
          },
        },
      },
      relatedEntities: [
        {
          type: 'timer',
          id: task.id,
          name: `Timer da tarefa ${task.title}`,
          metadata: {
            taskId: task.id,
            duration: duration || 0,
            status: 'paused',
          },
        },
        ...this.createTaskRelatedEntities(task, performer),
      ],
      context: this.createNotificationContext(performer, 'timer_pause', {
        duration,
      }),
    };

    const metadata: NotificationMetadata = {
      source: 'timer_system',
      category: NotificationCategory.TIMER,
      tags: ['timer', 'paused', 'task'],
      version: '1.0',
    };

    return this.createBaseNotification(
      this.type,
      this.getPriority(payload),
      data,
      metadata,
      userId,
    );
  }

  getPriority(_payload: NotificationPayload): NotificationPriority {
    return NotificationPriority.LOW;
  }
}

@Injectable()
export class TaskUpdatedStrategy extends BaseNotificationStrategy {
  readonly type = NotificationType.TASK_UPDATED;

  validate(payload: NotificationPayload): boolean {
    const p = payload as Partial<TaskUpdatedPayloadShape>;
    return (
      !!p &&
      !!p.task &&
      !!p.task.id &&
      !!p.task.title &&
      !!p.updatedBy &&
      typeof p.updatedBy === 'number' &&
      Array.isArray(p.changedFields)
    );
  }

  create(payload: NotificationPayload): StructuredNotification {
    const p = payload as unknown as TaskUpdatedPayloadShape;
    if (!this.validate(payload)) {
      throw new Error('Invalid payload for TaskUpdatedStrategy');
    }

    const { task, updatedBy, performer, changedFields } = p;

    const data = {
      actorName: performer?.name || 'Usuário desconhecido',
      taskTitle: task.title,
      taskId: task.id,
      changedFields: changedFields.map((field) => ({
        field: field.field,
        oldValue: field.oldValue,
        newValue: field.newValue,
      })),
    };

    const metadata: NotificationMetadata = {
      source: 'task_system',
      category: NotificationCategory.TASK,
      tags: ['task', 'updated'],
      version: '1.0',
    };

    return this.createBaseNotification(
      this.type,
      NotificationPriority.MEDIUM,
      data,
      metadata,
      updatedBy,
    );
  }

  getPriority(_payload: NotificationPayload): NotificationPriority {
    return NotificationPriority.MEDIUM;
  }
}
