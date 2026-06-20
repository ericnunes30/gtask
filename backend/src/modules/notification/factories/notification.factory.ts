import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  StructuredNotification,
  NotificationStrategy,
} from '../interfaces/notification.types';

@Injectable()
export class NotificationFactory {
  private readonly strategies = new Map<string, NotificationStrategy>();
  private readonly logger = new Logger(NotificationFactory.name);

  constructor(
    @Inject('NOTIFICATION_STRATEGY') strategies: NotificationStrategy[],
  ) {
    strategies.forEach((strategy) => {
      this.strategies.set(strategy.type, strategy);
    });
  }

  create(
    eventType: string,
    payload: Record<string, unknown>,
  ): StructuredNotification {
    try {
      const strategy = this.strategies.get(eventType);
      if (!strategy) {
        throw new Error(`No strategy found for event type: ${eventType}`);
      }

      if (!strategy.validate(payload)) {
        throw new Error(`Invalid payload for event type: ${eventType}`);
      }

      const notification = strategy.create(payload);

      this.logger.debug(`Notification created for event: ${eventType}`);

      return notification;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to create notification for event: ${eventType}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  validateNotification(notification: Partial<StructuredNotification>): boolean {
    const requiredFields = ['userId', 'type', 'priority', 'data', 'metadata'];

    for (const field of requiredFields) {
      if (!notification[field as keyof StructuredNotification]) {
        this.logger.warn(`Missing required field: ${field}`);
        return false;
      }
    }

    const data = notification.data;

    if (
      this.isValidTaskCreatedData(data) ||
      this.isValidTaskStatusUpdatedData(data) ||
      this.isValidCommentCreatedData(data) ||
      this.isValidTaskUpdatedData(data)
    ) {
      return true;
    }

    if (
      data &&
      typeof data === 'object' &&
      'entityType' in data &&
      'entityId' in data
    ) {
      return true;
    }

    this.logger.warn('Invalid notification data structure');
    return false;
  }

  private isValidTaskCreatedData(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      typeof d.actorName === 'string' &&
      typeof d.taskTitle === 'string' &&
      (d.projectTitle === undefined || typeof d.projectTitle === 'string')
    );
  }

  private isValidTaskStatusUpdatedData(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      typeof d.actorName === 'string' &&
      typeof d.taskTitle === 'string' &&
      typeof d.oldStatus === 'string' &&
      typeof d.newStatus === 'string'
    );
  }

  private isValidCommentCreatedData(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      typeof d.actorName === 'string' &&
      typeof d.taskTitle === 'string' &&
      typeof d.commentSnippet === 'string'
    );
  }

  private isValidTaskUpdatedData(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    if (!Array.isArray(d.changedFields)) return false;
    return (
      typeof d.actorName === 'string' &&
      typeof d.taskTitle === 'string' &&
      d.changedFields.every(
        (field: unknown) =>
          !!field &&
          typeof field === 'object' &&
          typeof (field as Record<string, unknown>).field === 'string' &&
          typeof (field as Record<string, unknown>).oldValue === 'string' &&
          typeof (field as Record<string, unknown>).newValue === 'string',
      )
    );
  }

  getRegisteredEvents(): string[] {
    return Array.from(this.strategies.keys());
  }

  hasStrategy(eventType: string): boolean {
    return this.strategies.has(eventType);
  }

  validateRequiredEvents(): boolean {
    const requiredEvents = [
      'task.created',
      'task.status.updated',
      'comment.created',
      'timer.started',
      'timer.paused',
      'task.updated',
    ];

    const missingEvents = requiredEvents.filter(
      (event) => !this.hasStrategy(event),
    );

    if (missingEvents.length > 0) {
      this.logger.warn(
        `Missing strategies for events: ${missingEvents.join(', ')}`,
      );
      return false;
    }

    return true;
  }
}
