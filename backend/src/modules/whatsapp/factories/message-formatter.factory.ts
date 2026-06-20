import { Injectable } from '@nestjs/common';
import {
  NotificationType,
  MessageTemplate,
  NotificationPriority,
} from '../interfaces/whatsapp.types';
import { StructuredNotificationEntity } from '../../notification/entities/notification.entity';

/**
 * Type guard: verifica se um valor e um enum string valido.
 */
function isEnumValue<T extends Record<string, string>>(
  value: unknown,
  enumObj: T,
): value is T[keyof T] {
  return typeof value === 'string' && Object.values(enumObj).includes(value);
}

@Injectable()
export class MessageFormatterService {
  private readonly templates: Map<NotificationType, MessageTemplate> = new Map([
    [
      NotificationType.TASK_CREATED,
      {
        type: NotificationType.TASK_CREATED,
        template: '📝 Nova tarefa: {title}',
        priority: NotificationPriority.MEDIUM,
      },
    ],
    [
      NotificationType.TASK_STATUS_CHANGED,
      {
        type: NotificationType.TASK_STATUS_CHANGED,
        template: '🔄 Status alterado: {title} → {new_status}',
        priority: NotificationPriority.MEDIUM,
      },
    ],
    [
      NotificationType.COMMENT_CREATED,
      {
        type: NotificationType.COMMENT_CREATED,
        template: '💬 Novo comentário em: {title}',
        priority: NotificationPriority.LOW,
      },
    ],
    [
      NotificationType.TIMER_STARTED,
      {
        type: NotificationType.TIMER_STARTED,
        template: '⏰ Timer iniciado: {title}',
        priority: NotificationPriority.LOW,
      },
    ],
    [
      NotificationType.TIMER_PAUSED,
      {
        type: NotificationType.TIMER_PAUSED,
        template: '⏸️ Timer pausado: {title}',
        priority: NotificationPriority.LOW,
      },
    ],
  ]);

  formatMessage(notification: StructuredNotificationEntity): string {
    const type = isEnumValue(notification.type, NotificationType)
      ? notification.type
      : undefined;
    const template = type ? this.templates.get(type) : undefined;

    if (!template) {
      const title = this.extractTitleFromData(notification.data);
      return `📢 Notificação: ${title}`;
    }

    let message = template.template;

    const title = this.extractTitleFromData(notification.data);
    message = message.replace('{title}', title);

    const data = notification.data as Record<string, unknown> | null;
    if (data && typeof data === 'object') {
      if (typeof data.newStatus === 'string') {
        message = message.replace('{new_status}', data.newStatus);
      }
      if (typeof data.commentSnippet === 'string') {
        message += `\n\n"${data.commentSnippet}"`;
      }
    }

    if (isEnumValue(notification.priority, NotificationPriority)) {
      const priority: NotificationPriority = notification.priority;
      if (priority === NotificationPriority.HIGH) {
        message = `🔴 ${message}`;
      } else if (priority === NotificationPriority.URGENT) {
        message = `🚨 ${message}`;
      }
    }

    return message;
  }

  private extractTitleFromData(data: unknown): string {
    if (!data || typeof data !== 'object') {
      return 'Notificação';
    }

    const d = data as Record<string, unknown>;

    if (typeof d.taskTitle === 'string') return d.taskTitle;
    if (typeof d.title === 'string') return d.title;

    if (d.entityType === 'task' && Array.isArray(d.relatedEntities)) {
      const taskEntity = (
        d.relatedEntities as Array<Record<string, unknown>>
      ).find((e) => e.type === 'task');
      if (taskEntity && typeof taskEntity.name === 'string') {
        return taskEntity.name;
      }
    }

    return 'Notificação';
  }

  getTemplatePriority(type: NotificationType): NotificationPriority {
    const template = this.templates.get(type);
    return template?.priority || NotificationPriority.LOW;
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    // Validar formato brasileiro: 559999999999 ou 5599999999999
    const regex = /^55\d{10,11}$/;
    return regex.test(phoneNumber.replace(/\D/g, ''));
  }

  formatPhoneNumber(phoneNumber: string): string {
    // Remover todos os caracteres não numéricos
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Adicionar 55 se não tiver
    if (cleaned.length === 10 || cleaned.length === 11) {
      return `55${cleaned}`;
    }

    return cleaned;
  }
}
