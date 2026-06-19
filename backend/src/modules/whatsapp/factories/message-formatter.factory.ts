import { Injectable } from '@nestjs/common';
import {
  NotificationType,
  MessageTemplate,
  NotificationPriority,
} from '../interfaces/whatsapp.types';
import { StructuredNotificationEntity } from '../../notification/entities/notification.entity';

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
    const template = this.templates.get(notification.type as NotificationType);

    if (!template) {
      // Obter título dos dados da notificação
      const title = this.extractTitleFromData(notification.data);
      return `📢 Notificação: ${title}`;
    }

    let message = template.template;

    // Substituir placeholders com dados da notificação
    const title = this.extractTitleFromData(notification.data);
    message = message.replace('{title}', title);

    if (notification.data && typeof notification.data === 'object') {
      // Para mudança de status
      if ('newStatus' in notification.data && notification.data.newStatus) {
        message = message.replace('{new_status}', notification.data.newStatus);
      }
      // Para comentários
      if (
        'commentSnippet' in notification.data &&
        notification.data.commentSnippet
      ) {
        message += `\n\n"${notification.data.commentSnippet}"`;
      }
    }

    // Adicionar prioridade visual
    if (notification.priority === NotificationPriority.HIGH) {
      message = `🔴 ${message}`;
    } else if (notification.priority === NotificationPriority.URGENT) {
      message = `🚨 ${message}`;
    }

    return message;
  }

  private extractTitleFromData(data: any): string {
    if (!data || typeof data !== 'object') {
      return 'Notificação';
    }

    // Verificar diferentes possíveis campos de título
    if ('taskTitle' in data) return data.taskTitle;
    if ('title' in data) return data.title;
    if (
      'entityType' in data &&
      data.entityType === 'task' &&
      data.relatedEntities
    ) {
      const taskEntity = data.relatedEntities.find(
        (e: any) => e.type === 'task',
      );
      if (taskEntity && taskEntity.name) return taskEntity.name;
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
