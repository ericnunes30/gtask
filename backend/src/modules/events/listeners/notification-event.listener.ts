import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { Task } from '../../tasks/entities/task.entity';
import { Comment } from '../../comment/entities/comment.entity';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationFactory } from '../../notification/factories/notification.factory';
import { DebugLoggerService } from '../../notification/services/debug-logger.service';
import { UserService } from '../../user/services/user.service';
import type { NotificationRecipientResolver } from '../../notification/interfaces/notification-recipient-resolver.interface';
import { NOTIFICATION_RECIPIENT_RESOLVER } from '../../notification/interfaces/notification-recipient-resolver.token';

@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationFactory: NotificationFactory,
    private readonly debugLogger: DebugLoggerService,
    private readonly userService: UserService,
    @Inject(NOTIFICATION_RECIPIENT_RESOLVER)
    private readonly recipientResolver: NotificationRecipientResolver,
  ) {}

  private serverRef: Server | null = null;

  setServer(server: Server): void {
    this.serverRef = server;
  }

  /** Converte um valor `unknown` em `number | undefined` para passar a APIs tipadas. */
  private toUserId(value: unknown): number | undefined {
    return typeof value === 'number' ? value : undefined;
  }

  private async handleEvent<T extends Record<string, unknown>>(
    eventName: string,
    payload: T,
    getUsersToNotify: (payload: T) => number[],
  ): Promise<void> {
    this.logger.log(
      `🚀 Event ${eventName} received, creating persistent notifications...`,
    );
    this.debugLogger.logNotificationEvent(
      eventName,
      payload,
      this.toUserId(payload.createdBy ?? payload.updatedBy),
    );

    if (!this.notificationFactory.hasStrategy(eventName)) {
      this.logger.warn(
        `⚠️ No notification strategy found for event: ${eventName}`,
      );
      return;
    }

    const userIdsToNotify = getUsersToNotify(payload);
    const uniqueUserIds = [...new Set(userIdsToNotify)];

    if (uniqueUserIds.length === 0) {
      this.logger.log(`🚀 No users to notify for event ${eventName}`);
      return;
    }

    let enrichedPayload: T & {
      performer?: { id: number; name: string; email: string };
    } = payload;
    try {
      const actorId = payload.createdBy || payload.updatedBy || payload.userId;
      if (actorId) {
        const actor = await this.userService.findOne(Number(actorId));
        enrichedPayload = {
          ...payload,
          performer: {
            id: actor.id,
            name: actor.name,
            email: actor.email,
          },
        };
      }
    } catch (e: unknown) {
      this.logger.warn(
        `Could not enrich payload with performer: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    for (const userId of uniqueUserIds) {
      await this.processNotification(
        eventName,
        userId,
        enrichedPayload as Record<string, unknown>,
      );
    }
  }

  private emitToUser(userId: number, notification: unknown): void {
    if (!this.serverRef) return;
    this.serverRef
      .to(`user_${userId}`)
      .emit('new_structured_notification', notification);
    this.logger.log(`🚀 WebSocket notification sent to user_${userId}`);
  }

  private async processNotification(
    eventName: string,
    userId: number,
    enrichedPayload: Record<string, unknown>,
  ): Promise<void> {
    try {
      const notification = this.notificationFactory.create(
        eventName,
        enrichedPayload,
      );
      notification.userId = userId;

      this.logger.log(
        `GATEWAY: Creating notification for user ${userId}, Event: ${eventName}`,
      );

      const savedNotification =
        await this.notificationService.create(notification);
      this.logger.log(
        `✅ Notification created successfully for user ${userId} with ID ${savedNotification.id}`,
      );

      this.emitToUser(userId, savedNotification);

      this.debugLogger.logNotificationEvent(
        'structured_notification_sent',
        {
          userId,
          type: eventName,
          notificationId: savedNotification.id,
        },
        userId,
      );
    } catch (error: unknown) {
      this.logger.error(
        `❌ Failed to create or send structured notification for user ${userId}:`,
        error,
      );
    }
  }

  @OnEvent('task.created')
  async handleTaskCreatedEvent(payload: { task: Task; createdBy: number }) {
    this.logger.log(`🆕 Task created event received: ${payload.task.title}`);
    await this.handleEvent('task.created', payload, (p) =>
      this.recipientResolver.getTaskCreatedNotificationRecipients(
        p.task,
        p.createdBy,
      ),
    );
  }

  @OnEvent('task.status.changed')
  async handleTaskStatusUpdatedEvent(payload: {
    task: Task;
    updatedBy: number;
    oldStatus: string;
    newStatus: string;
  }) {
    this.logger.log(
      `🔄 Task status changed event received: ${payload.oldStatus} → ${payload.newStatus}`,
    );
    await this.handleEvent('task.status.changed', payload, (p) =>
      this.recipientResolver.getTaskStatusUpdatedNotificationRecipients(
        p.task,
        p.updatedBy,
        p.newStatus,
      ),
    );
  }

  @OnEvent('comment.created')
  async handleCommentCreatedEvent(payload: {
    comment: Comment;
    createdBy: number;
  }) {
    this.logger.log(
      `💬 Comment created event received: ${payload.comment.content.substring(0, 50)}...`,
    );
    await this.handleEvent('comment.created', payload, (p) =>
      this.recipientResolver.getCommentCreatedNotificationRecipients(
        p.comment,
        p.createdBy,
      ),
    );
  }

  @OnEvent('task.updated')
  async handleTaskUpdatedEvent(payload: {
    task: Task;
    updatedBy: number;
    changedFields: Record<string, { oldValue: unknown; newValue: unknown }>;
  }) {
    this.logger.log(
      `📝 Task updated event received: ${payload.task.title} - Fields changed: ${Object.keys(payload.changedFields).join(', ')}`,
    );
    await this.handleEvent('task.updated', payload, (p) =>
      this.recipientResolver.getTaskUpdatedNotificationRecipients(
        p.task,
        p.updatedBy,
      ),
    );
  }
}
