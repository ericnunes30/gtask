import { Logger, Injectable, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Task } from '../../tasks/entities/task.entity';
import { Comment } from '../../comment/entities/comment.entity';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationFactory } from '../../notification/factories/notification.factory';
import { DebugLoggerService } from '../../notification/services/debug-logger.service';
import { TimerService } from '../../tasks/services/timer.service';
import { UserService } from '../../user/services/user.service';
import { PermissionService } from '../../permission/services/permission.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Em produção, restrinja para o seu domínio dofrontend
  },
})
@Injectable()
export class EventsGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    OnModuleInit
{
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationFactory: NotificationFactory,
    private readonly timerService: TimerService,
    private readonly debugLogger: DebugLoggerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly userService: UserService,
    private readonly permissionService: PermissionService,
  ) {
    // Bridge timer events to WS rooms (complements @OnEvent handlers)
    this.eventEmitter.on(
      'timer.started',
      (payload: { taskId: number; userId: number }) => {
        this.logger.log(`Bridging timer.started for task ${payload.taskId}`);
        this.server
          ?.to(`task_${payload.taskId}`)
          .emit('timer.started', payload);
      },
    );
    this.eventEmitter.on(
      'timer.paused',
      (payload: { taskId: number; seconds: number; userId?: number }) => {
        this.server?.to(`task_${payload.taskId}`).emit('timer.paused', payload);
      },
    );
    this.eventEmitter.on(
      'timer.tick',
      (payload: { taskId: number; seconds: number }) => {
        this.server?.to(`task_${payload.taskId}`).emit('timer.tick', payload);
      },
    );
  }

  // Resilience improvements for Phase 3
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second
  private isInitialized = false;

  afterInit(_server: Server) {
    // Server is ready
    this.logger.log('WebSocket server initialized');
  }

  onModuleInit(): void {
    this.logger.log(
      '🚀 EventsGateway initializing - performing startup verification...',
    );
    this.performStartupVerification();
    this.isInitialized = true;
    this.logger.log('✅ EventsGateway initialization completed successfully');
  }

  private performStartupVerification(): void {
    try {
      // Verify all required services are available
      this.verifyServicesAvailability();

      // Verify event handlers are registered
      this.verifyEventHandlers();

      this.logger.log('✅ All startup verification checks passed');
    } catch (error) {
      this.logger.error('❌ Startup verification failed:', error);
      throw error;
    }
  }

  private verifyServicesAvailability(): void {
    const services = [
      { name: 'NotificationService', service: this.notificationService },
      { name: 'NotificationFactory', service: this.notificationFactory },
      { name: 'TimerService', service: this.timerService },
      { name: 'DebugLoggerService', service: this.debugLogger },
    ];

    for (const { name, service } of services) {
      if (!service) {
        throw new Error(`Required service ${name} is not available`);
      }
      this.logger.log(`✅ Service ${name} is available`);
    }
  }

  private verifyEventHandlers(): void {
    // Verify that event handlers are properly registered
    const handlerMethods = [
      'handleTaskCreatedEvent',
      'handleTaskStatusUpdatedEvent',
      'handleCommentCreatedEvent',
      'handleTaskUpdatedEvent',
      'handleTimerStartedEvent',
      'handleTimerPausedEvent',
      'handleTimerTickEvent',
    ];

    for (const methodName of handlerMethods) {
      if (typeof (this as any)[methodName] !== 'function') {
        this.logger.warn(`⚠️  Event handler method ${methodName} not found`);
      } else {
        this.logger.log(`✅ Event handler ${methodName} is registered`);
      }
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = this.maxRetries,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `⚠️  ${operationName} failed (attempt ${attempt}/${maxRetries}):`,
          error,
        );

        if (attempt < maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    const finalError =
      lastError ||
      new Error(`${operationName} failed after ${maxRetries} attempts`);
    this.logger.error(
      `❌ ${operationName} failed after ${maxRetries} attempts:`,
      finalError,
    );
    throw finalError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  handleConnection(client: Socket, ..._args: any[]) {
    const userId = (client as Socket & { user?: any }).user?.sub;

    if (!userId) {
      this.logger.warn(`Unauthorized WS connection: ${client.id}`);
      this.debugLogger.logWebSocketEvent('unauthorized_connection', client.id);
      client.disconnect();
      return;
    }

    this.logger.log(`Client connected: ${client.id} (user ${userId})`);
    this.debugLogger.logWebSocketEvent('connection', client.id, { userId });
    void client.join(`user_${userId}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-task-room')
  handleJoinTaskRoom(client: Socket, taskId: string) {
    this.logger.log(`Client ${client.id} joining task room: ${taskId}`);
    void client.join(`task_${taskId}`);
  }

  @SubscribeMessage('leave-task-room')
  handleLeaveTaskRoom(client: Socket, taskId: string) {
    this.logger.log(`Client ${client.id} leaving task room: ${taskId}`);
    void client.leave(`task_${taskId}`);
  }

  // --- Handlers de Eventos do Timer ---

  @SubscribeMessage('timer.start')
  async handleTimerStart(client: Socket, payload: { taskId: number }) {
    const userId = (client as Socket & { user?: any }).user?.sub;
    if (!userId) {
      this.logger.warn(`Unauthorized timer.start from ${client.id}`);
      client.emit('error', {
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
      client.disconnect();
      return;
    }
    this.logger.log(
      `Timer start requested for task ${payload.taskId} by user ${userId}`,
    );
    try {
      await this.timerService.start(payload.taskId, userId);
    } catch (err: any) {
      this.logger.error(
        `Failed to start timer for task ${payload.taskId}: ${err?.message}`,
      );
      client.emit('error', {
        code: 'TIMER_START_FAILED',
        message: 'Unable to start timer',
      });
    }
  }

  @SubscribeMessage('timer.pause')
  async handleTimerPause(client: Socket, payload: { taskId: number }) {
    const userId = (client as Socket & { user?: any }).user?.sub;
    if (!userId) {
      this.logger.warn(`Unauthorized timer.pause from ${client.id}`);
      client.emit('error', {
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
      client.disconnect();
      return;
    }
    this.logger.log(
      `Timer pause requested for task ${payload.taskId} by user ${userId}`,
    );
    try {
      await this.timerService.pause(payload.taskId, userId);
    } catch (err: any) {
      this.logger.error(
        `Failed to pause timer for task ${payload.taskId}: ${err?.message}`,
      );
      client.emit('error', {
        code: 'TIMER_PAUSE_FAILED',
        message: 'Unable to pause timer',
      });
    }
  }

  @OnEvent('timer.started')
  handleTimerStartedEvent(payload: { taskId: number; userId: number }) {
    this.logger.log(`Broadcasting timer.started for task ${payload.taskId}`);
    this.server.to(`task_${payload.taskId}`).emit('timer.started', payload);
  }

  @OnEvent('timer.paused')
  handleTimerPausedEvent(payload: {
    taskId: number;
    userId: number;
    seconds: number;
  }) {
    this.logger.log(`Broadcasting timer.paused for task ${payload.taskId}`);
    this.server.to(`task_${payload.taskId}`).emit('timer.paused', payload);
  }

  @OnEvent('timer.tick')
  handleTimerTickEvent(payload: { taskId: number; seconds: number }) {
    // This can be very verbose, so we can comment it out in production
    // this.logger.log(`Broadcasting timer.tick for task ${payload.taskId}`);
    this.server.to(`task_${payload.taskId}`).emit('timer.tick', payload);
  }

  // --- Fim dos Handlers de Eventos do Timer ---

  private async handleEvent(
    eventName: string,
    payload: any,
    getUsersToNotify: (payload: any) => number[],
  ) {
    this.logger.log(
      `🚀 Event ${eventName} received, creating persistent notifications...`,
    );
    this.logger.log(
      `🚀 Debug: Event payload = ${JSON.stringify(payload, null, 2)}`,
    );
    this.debugLogger.logNotificationEvent(
      eventName,
      payload,
      payload.createdBy || payload.updatedBy,
    );

    if (!this.notificationFactory.hasStrategy(eventName)) {
      this.logger.warn(
        `⚠️ No notification strategy found for event: ${eventName}`,
      );
      this.logger.log(
        `🚀 Available strategies: ${this.notificationFactory.getRegisteredEvents().join(', ')}`,
      );
      return;
    }

    const userIdsToNotify = getUsersToNotify(payload);
    const uniqueUserIds = [...new Set(userIdsToNotify)];

    this.logger.log(`🚀 User IDs to notify: ${uniqueUserIds.join(', ')}`);
    this.logger.log(`🚀 Total unique users: ${uniqueUserIds.length}`);

    if (uniqueUserIds.length === 0) {
      this.logger.log(`🚀 No users to notify for event ${eventName}`);
      return;
    }

    // Try to enrich payload with performer (actor) details
    let enrichedPayload = payload;
    try {
      const actorId =
        payload?.createdBy || payload?.updatedBy || payload?.userId;
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
    } catch (e: any) {
      this.logger.warn(
        `Could not enrich payload with performer: ${e?.message || e}`,
      );
    }

    for (const userId of uniqueUserIds) {
      try {
        this.logger.log(`📝 Creating notification for user ${userId}...`);
        const notification = this.notificationFactory.create(
          eventName,
          enrichedPayload,
        );
        notification.userId = userId;

        this.logger.log(
          `🚀 Notification payload: ${JSON.stringify(notification, null, 2)}`,
        );

        this.logger.log(
          `GATEWAY: Creating notification for user ${userId}, Event: ${eventName}`,
        );

        const savedNotification =
          await this.notificationService.create(notification);
        this.logger.log(
          `✅ Notification created successfully for user ${userId} with ID ${savedNotification.id}`,
        );

        this.logger.log(
          `GATEWAY: Notification created successfully - ID: ${savedNotification.id}, User: ${userId}, Event: ${eventName}`,
        );

        this.server
          .to(`user_${userId}`)
          .emit('new_structured_notification', savedNotification);
        this.logger.log(`🚀 WebSocket notification sent to user_${userId}`);

        this.logger.log(
          `GATEWAY: WebSocket notification sent to user_${userId}`,
        );

        this.debugLogger.logNotificationEvent(
          'structured_notification_sent',
          {
            userId,
            type: eventName,
            notificationId: savedNotification.id,
          },
          userId,
        );
      } catch (error) {
        this.logger.error(
          `GATEWAY ERROR: Failed to create notification for user ${userId}, Event: ${eventName}, Error: ${error.message}`,
        );

        this.logger.error(
          `❌ Failed to create or send structured notification for user ${userId}:`,
          error,
        );
        this.logger.error(`❌ Error details: ${error.message}`);
      }
    }
  }

  @OnEvent('task.created')
  async handleTaskCreatedEvent(payload: { task: Task; createdBy: number }) {
    this.logger.log(`🆕 Task created event received: ${payload.task.title}`);
    await this.handleEvent('task.created', payload, (p) => {
      const { task, createdBy } = p;
      return this.permissionService.getTaskCreatedNotificationRecipients(
        task,
        createdBy,
      );
    });
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
    await this.handleEvent('task.status.changed', payload, (p) => {
      const { task, updatedBy, newStatus } = p;
      return this.permissionService.getTaskStatusUpdatedNotificationRecipients(
        task,
        updatedBy,
        newStatus,
      );
    });
  }

  @OnEvent('comment.created')
  async handleCommentCreatedEvent(payload: {
    comment: Comment;
    createdBy: number;
  }) {
    this.logger.log(
      `💬 Comment created event received: ${payload.comment.content.substring(0, 50)}...`,
    );
    this.logger.log(`💬 Debug: Gateway initialized = ${this.isInitialized}`);
    this.logger.log(
      `💬 Debug: Has notification strategy = ${this.notificationFactory.hasStrategy('comment.created')}`,
    );
    this.logger.log(
      `💬 Debug: Comment data = ${JSON.stringify({
        id: payload.comment.id,
        task_id: payload.comment.task_id,
        content: payload.comment.content,
        createdBy: payload.createdBy,
      })}`,
    );

    if (!this.isInitialized) {
      this.logger.warn(
        '⚠️  EventsGateway not fully initialized, skipping comment.created event',
      );
      return;
    }

    this.logger.log(`💬 Starting notification creation process...`);
    await this.handleEvent('comment.created', payload, (p) => {
      const { comment, createdBy } = p;
      return this.permissionService.getCommentCreatedNotificationRecipients(
        comment,
        createdBy,
      );
    });
  }

  @OnEvent('task.updated')
  async handleTaskUpdatedEvent(payload: {
    task: Task;
    updatedBy: number;
    changedFields: Record<string, { oldValue: any; newValue: any }>;
  }) {
    this.logger.log(
      `📝 Task updated event received: ${payload.task.title} - Fields changed: ${Object.keys(payload.changedFields).join(', ')}`,
    );
    await this.handleEvent('task.updated', payload, (p) => {
      const { task, updatedBy } = p;
      return this.permissionService.getTaskUpdatedNotificationRecipients(
        task,
        updatedBy,
      );
    });
  }
}
