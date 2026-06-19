import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    strategies.forEach(strategy => {
      this.strategies.set(strategy.type, strategy);
    });
  }

  create(eventType: string, payload: any): StructuredNotification {
    try {
      const strategy = this.strategies.get(eventType);
      if (!strategy) {
        throw new Error(`No strategy found for event type: ${eventType}`);
      }

      // Validar payload antes de criar
      if (!strategy.validate(payload)) {
        throw new Error(`Invalid payload for event type: ${eventType}`);
      }

      const notification = strategy.create(payload);
      
      this.logger.debug(`Notification created for event: ${eventType}`);
      
      return notification;
    } catch (error) {
      this.logger.error(`Failed to create notification for event: ${eventType}`, error);
      throw error;
    }
  }

  // Método para validar notificações antes da criação
  validateNotification(notification: Partial<StructuredNotification>): boolean {
    const requiredFields = ['userId', 'type', 'priority', 'data', 'metadata'];
    
    for (const field of requiredFields) {
      if (!notification[field as keyof StructuredNotification]) {
        this.logger.warn(`Missing required field: ${field}`);
        return false;
      }
    }

    // Validação de dados estruturados para os novos formatos
    const data = notification.data;
    
    // Verifica se é um dos novos formatos de dados
    if (this.isValidTaskCreatedData(data) ||
        this.isValidTaskStatusUpdatedData(data) ||
        this.isValidCommentCreatedData(data) ||
        this.isValidTaskUpdatedData(data)) {
      return true;
    }
    
    // Verifica se é o formato antigo
    if (data && typeof data === 'object' &&
        'entityType' in data && 'entityId' in data) {
      return true;
    }
    
    this.logger.warn('Invalid notification data structure');
    return false;
  }

  private isValidTaskCreatedData(data: any): boolean {
    return data &&
           typeof data === 'object' &&
           typeof data.actorName === 'string' &&
           typeof data.taskTitle === 'string' &&
           (data.projectTitle === undefined || typeof data.projectTitle === 'string');
  }

  private isValidTaskStatusUpdatedData(data: any): boolean {
    return data &&
           typeof data === 'object' &&
           typeof data.actorName === 'string' &&
           typeof data.taskTitle === 'string' &&
           typeof data.oldStatus === 'string' &&
           typeof data.newStatus === 'string';
  }

  private isValidCommentCreatedData(data: any): boolean {
    return data &&
           typeof data === 'object' &&
           typeof data.actorName === 'string' &&
           typeof data.taskTitle === 'string' &&
           typeof data.commentSnippet === 'string';
  }

  private isValidTaskUpdatedData(data: any): boolean {
    return data &&
           typeof data === 'object' &&
           typeof data.actorName === 'string' &&
           typeof data.taskTitle === 'string' &&
           Array.isArray(data.changedFields) &&
           data.changedFields.every((field: any) =>
             field &&
             typeof field === 'object' &&
             typeof field.field === 'string' &&
             typeof field.oldValue === 'string' &&
             typeof field.newValue === 'string'
           );
  }

  getRegisteredEvents(): string[] {
    return Array.from(this.strategies.keys());
  }

  hasStrategy(eventType: string): boolean {
    return this.strategies.has(eventType);
  }

  // Método para validar se todos os eventos necessários têm strategies
  validateRequiredEvents(): boolean {
    const requiredEvents = [
      'task.created',
      'task.status.updated',
      'comment.created',
      'timer.started',
      'timer.paused',
      'task.updated'
    ];

    const missingEvents = requiredEvents.filter(event => !this.hasStrategy(event));
    
    if (missingEvents.length > 0) {
      this.logger.warn(`Missing strategies for events: ${missingEvents.join(', ')}`);
      return false;
    }

    return true;
  }
}