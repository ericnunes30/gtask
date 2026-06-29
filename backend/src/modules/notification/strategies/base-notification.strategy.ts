import { Injectable, Logger } from '@nestjs/common';
import {
  StructuredNotification,
  NotificationType,
  NotificationPriority,
  NotificationMetadata,
  NotificationCategory,
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
export interface TaskLite {
  id: number;
  title: string;
  status?: string;
  priority?: string;
  project?: { id: number; title: string };
}

export interface TaskUpdatedChangeField {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface TaskUpdatedPayloadShape {
  task: TaskLite;
  updatedBy: number;
  performer?: Performer;
  changedFields: TaskUpdatedChangeField[];
}

@Injectable()
export abstract class BaseNotificationStrategy {
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

  protected createTimerNotificationData(
    task: TaskLite,
    action: string,
    status: string,
    duration: number | undefined,
    oldValue: Record<string, unknown> | null,
    performer: unknown,
  ): StructuredNotification['data'] {
    return {
      entityType: 'timer',
      entityId: task.id,
      action,
      changes: {
        timer: {
          oldValue,
          newValue: {
            taskId: task.id,
            duration: duration || 0,
            status,
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
            status,
          },
        },
        ...this.createTaskRelatedEntities(task, performer),
      ],
      context: this.createNotificationContext(performer, `timer_${action}`, {
        duration,
      }),
    };
  }

  protected createTimerMetadata(action: string): NotificationMetadata {
    return {
      source: 'timer_system',
      category: NotificationCategory.TIMER,
      tags: ['timer', action, 'task'],
      version: '1.0',
    };
  }
}
