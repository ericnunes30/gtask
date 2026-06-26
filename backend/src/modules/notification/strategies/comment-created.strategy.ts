import { Injectable } from '@nestjs/common';
import {
  NotificationType,
  NotificationPriority,
  NotificationMetadata,
  NotificationCategory,
  CommentCreatedPayload,
} from '../interfaces/notification.types';
import {
  BaseNotificationStrategy,
  NotificationPayload,
} from './base-notification.strategy';
import { InvalidStrategyPayloadException } from '../exceptions/invalid-strategy-payload.exception';

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

  create(
    payload: NotificationPayload,
  ): ReturnType<BaseNotificationStrategy['create']> {
    const p = payload as unknown as CommentCreatedPayload;
    if (!this.validate(payload)) {
      throw new InvalidStrategyPayloadException(
        NotificationType.COMMENT_CREATED,
      );
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
