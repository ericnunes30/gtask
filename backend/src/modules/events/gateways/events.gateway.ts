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

@WebSocketGateway({
  cors: {
    origin: '*', // Em produção, restrinja para o seu domínio dofrontend
  },
})
@Injectable()
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnModuleInit
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
  ) {
    // Bridge timer events to WS rooms (complements @OnEvent handlers)
    this.eventEmitter.on('timer.started', (payload: { taskId: number; userId: number }) => {
      this.logger.log(`Bridging timer.started for task ${payload.taskId}`);
      this.server?.to(`task_${payload.taskId}`).emit('timer.started', payload);
    });
    this.eventEmitter.on('timer.paused', (payload: { taskId: number; seconds: number; userId?: number }) => {
      this.server?.to(`task_${payload.taskId}`).emit('timer.paused', payload);
    });
    this.eventEmitter.on('timer.tick', (payload: { taskId: number; seconds: number }) => {
      this.server?.to(`task_${payload.taskId}`).emit('timer.tick', payload);
    });
  }

  // Resilience improvements for Phase 3
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second
  private isInitialized = false;

  afterInit(server: Server) {
    // Server is ready
    this.logger.log('WebSocket server initialized');
  }

  async onModuleInit() {
    this.logger.log('🚀 EventsGateway initializing - performing startup verification...');
    await this.performStartupVerification();
    this.isInitialized = true;
    this.logger.log('✅ EventsGateway initialization completed successfully');
  }

  private async performStartupVerification(): Promise<void> {
    try {
      // Verify all required services are available
      await this.verifyServicesAvailability();
      
      // Verify event handlers are registered
      await this.verifyEventHandlers();
      
      this.logger.log('✅ All startup verification checks passed');
    } catch (error) {
      this.logger.error('❌ Startup verification failed:', error);
      throw error;
    }
  }

  private async verifyServicesAvailability(): Promise<void> {
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

  private async verifyEventHandlers(): Promise<void> {
    // Verify that event handlers are properly registered
    const handlerMethods = [
      'handleTaskCreatedEvent',
      'handleTaskStatusUpdatedEvent', 
      'handleCommentCreatedEvent',
      'handleTaskUpdatedEvent',
      'handleTimerStartedEvent',
      'handleTimerPausedEvent',
      'handleTimerTickEvent'
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
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`⚠️  ${operationName} failed (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    const finalError = lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
    this.logger.error(`❌ ${operationName} failed after ${maxRetries} attempts:`, finalError);
    throw finalError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  handleConnection(client: Socket, ...args: any[]) {
    const userId = (client as Socket & { user?: any }).user?.sub;

    if (!userId) {
      this.logger.warn(`Unauthorized WS connection: ${client.id}`);
      this.debugLogger.logWebSocketEvent('unauthorized_connection', client.id);
      client.disconnect();
      return;
    }

    this.logger.log(`Client connected: ${client.id} (user ${userId})`);
    this.debugLogger.logWebSocketEvent('connection', client.id, { userId });
    client.join(`user_${userId}`);
    return;
    // TODO: Implementar autenticação WebSocket
    this.logger.log(`Client connected: ${client.id}`);
    this.debugLogger.logWebSocketEvent('connection', client.id);
    // Por enquanto, não desconectar clientes não autenticados
    // client.disconnect();
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-task-room')
  handleJoinTaskRoom(client: Socket, taskId: string) {
    this.logger.log(`Client ${client.id} joining task room: ${taskId}`);
    client.join(`task_${taskId}`);
  }

  @SubscribeMessage('leave-task-room')
  handleLeaveTaskRoom(client: Socket, taskId: string) {
    this.logger.log(`Client ${client.id} leaving task room: ${taskId}`);
    client.leave(`task_${taskId}`);
  }

  // --- Handlers de Eventos do Timer ---

  @SubscribeMessage('timer.start')
  handleTimerStart(client: Socket, payload: { taskId: number }) {
    const userId = (client as Socket & { user?: any }).user?.sub;
    if (!userId) {
      this.logger.warn(`Unauthorized timer.start from ${client.id}`);
      client.emit('error', { code: 'UNAUTHORIZED', message: 'Not authenticated' });
      client.disconnect();
      return;
    }
    this.logger.log(`Timer start requested for task ${payload.taskId} by user ${userId}`);
    try {
      this.timerService.start(payload.taskId, userId);
    } catch (err: any) {
      this.logger.error(`Failed to start timer for task ${payload.taskId}: ${err?.message}`);
      client.emit('error', { code: 'TIMER_START_FAILED', message: 'Unable to start timer' });
    }
    return;
    // TODO: Implementar autenticação WebSocket
    this.logger.log(`Timer start requested for task ${payload.taskId}`);
    // const user = client.user;
    // this.timerService.start(payload.taskId, user.sub);
  }

  @SubscribeMessage('timer.pause')
  handleTimerPause(client: Socket, payload: { taskId: number }) {
    const userId = (client as Socket & { user?: any }).user?.sub;
    if (!userId) {
      this.logger.warn(`Unauthorized timer.pause from ${client.id}`);
      client.emit('error', { code: 'UNAUTHORIZED', message: 'Not authenticated' });
      client.disconnect();
      return;
    }
    this.logger.log(`Timer pause requested for task ${payload.taskId} by user ${userId}`);
    try {
      this.timerService.pause(payload.taskId, userId);
    } catch (err: any) {
      this.logger.error(`Failed to pause timer for task ${payload.taskId}: ${err?.message}`);
      client.emit('error', { code: 'TIMER_PAUSE_FAILED', message: 'Unable to pause timer' });
    }
    return;
    // TODO: Implementar autenticação WebSocket
    this.logger.log(`Timer pause requested for task ${payload.taskId}`);
    // const user = client.user;
    // this.timerService.pause(payload.taskId, user.sub);
  }

  @OnEvent('timer.started')
  handleTimerStartedEvent(payload: { taskId: number; userId: number }) {
    this.logger.log(`Broadcasting timer.started for task ${payload.taskId}`);
    this.server.to(`task_${payload.taskId}`).emit('timer.started', payload);
  }

  @OnEvent('timer.paused')
  handleTimerPausedEvent(payload: { taskId: number; userId: number; seconds: number }) {
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
    this.logger.log(`🚀 Event ${eventName} received, creating persistent notifications...`);
    this.logger.log(`🚀 Debug: Event payload = ${JSON.stringify(payload, null, 2)}`);
    this.debugLogger.logNotificationEvent(eventName, payload, payload.createdBy || payload.updatedBy);

    if (!this.notificationFactory.hasStrategy(eventName)) {
      this.logger.warn(`⚠️ No notification strategy found for event: ${eventName}`);
      this.logger.log(`🚀 Available strategies: ${this.notificationFactory.getRegisteredEvents().join(', ')}`);
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
      const actorId = payload?.createdBy || payload?.updatedBy || payload?.userId;
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
    } catch (e) {
      this.logger.warn(`Could not enrich payload with performer: ${(e as any)?.message || e}`);
    }

    for (const userId of uniqueUserIds) {
      try {
        this.logger.log(`📝 Creating notification for user ${userId}...`);
        const notification = this.notificationFactory.create(eventName, enrichedPayload);
        notification.userId = userId; 
        
        this.logger.log(`🚀 Notification payload: ${JSON.stringify(notification, null, 2)}`);
        
        this.logger.log(`GATEWAY: Creating notification for user ${userId}, Event: ${eventName}`);
        
        const savedNotification = await this.notificationService.create(notification);
        this.logger.log(`✅ Notification created successfully for user ${userId} with ID ${savedNotification.id}`);
        
        this.logger.log(`GATEWAY: Notification created successfully - ID: ${savedNotification.id}, User: ${userId}, Event: ${eventName}`);
        
        this.server.to(`user_${userId}`).emit('new_structured_notification', savedNotification);
        this.logger.log(`🚀 WebSocket notification sent to user_${userId}`);
        
        this.logger.log(`GATEWAY: WebSocket notification sent to user_${userId}`);
        
        this.debugLogger.logNotificationEvent('structured_notification_sent', {
          userId,
          type: eventName,
          notificationId: savedNotification.id,
        }, userId);
      } catch (error) {
        this.logger.error(`GATEWAY ERROR: Failed to create notification for user ${userId}, Event: ${eventName}, Error: ${error.message}`);
        
        this.logger.error(`❌ Failed to create or send structured notification for user ${userId}:`, error);
        this.logger.error(`❌ Error details: ${error.message}`);
      }
    }
  }

  @OnEvent('task.created')
  async handleTaskCreatedEvent(payload: { task: Task; createdBy: number }) {
    this.logger.log(`🆕 Task created event received: ${payload.task.title}`);
    await this.handleEvent('task.created', payload, (p) => {
      const { task, createdBy } = p;
      const userIds = task.users?.map((user) => user.id).filter((id) => id !== createdBy) || [];
      if (task.project?.users) {
        for (const user of task.project.users) {
          if (user.id !== createdBy && !userIds.includes(user.id)) {
            userIds.push(user.id);
          }
        }
      }
      return userIds;
    });
  }

  @OnEvent('task.status.changed')
  async handleTaskStatusUpdatedEvent(payload: {
    task: Task;
    updatedBy: number;
    oldStatus: string;
    newStatus: string;
  }) {
    this.logger.log(`🔄 Task status changed event received: ${payload.oldStatus} → ${payload.newStatus}`);
    await this.handleEvent('task.status.changed', payload, (p) => {
      const { task, updatedBy, newStatus } = p;
      // If moved to review, notify only the reviewer (if different from actor)
      if (newStatus === 'em_revisao') {
        const reviewerId = (task as any)?.reviewer?.id ?? (task as any)?.task_reviewer_id ?? null;
        if (reviewerId && reviewerId !== updatedBy) {
          return [reviewerId];
        }
        return [];
      }

      // Default behavior: notify task and project members (excluding actor)
      const userIds = task.users?.map((user) => user.id).filter((id) => id !== updatedBy) || [];
      if (task.project?.users) {
        for (const user of task.project.users) {
          if (user.id !== updatedBy && !userIds.includes(user.id)) {
            userIds.push(user.id);
          }
        }
      }
      return userIds;
    });
  }

  @OnEvent('comment.created')
  async handleCommentCreatedEvent(payload: { comment: Comment; createdBy: number }) {
    this.logger.log(`💬 Comment created event received: ${payload.comment.content.substring(0, 50)}...`);
    this.logger.log(`💬 Debug: Gateway initialized = ${this.isInitialized}`);
    this.logger.log(`💬 Debug: Has notification strategy = ${this.notificationFactory.hasStrategy('comment.created')}`);
    this.logger.log(`💬 Debug: Comment data = ${JSON.stringify({
      id: payload.comment.id,
      task_id: payload.comment.task_id,
      content: payload.comment.content,
      createdBy: payload.createdBy
    })}`);
    
    if (!this.isInitialized) {
      this.logger.warn('⚠️  EventsGateway not fully initialized, skipping comment.created event');
      return;
    }
    
    this.logger.log(`💬 Starting notification creation process...`);
    await this.handleEvent('comment.created', payload, (p) => {
        this.logger.log(`💬 Processing notification logic for comment...`);
        const { comment, createdBy } = p;
        const userIds = comment.task?.users?.map((user) => user.id).filter((id) => id !== createdBy) || [];
        this.logger.log(`💬 Users from task: ${userIds.join(', ')}`);
        
        if (comment.task?.project?.users) {
            for (const user of comment.task.project.users) {
            if (user.id !== createdBy && !userIds.includes(user.id)) {
                userIds.push(user.id);
            }
            }
            this.logger.log(`💬 Users from project: ${userIds.join(', ')}`);
        }
        
        this.logger.log(`💬 Final user IDs to notify: ${userIds.join(', ')}`);
        return userIds;
    });
  }

  @OnEvent('task.updated')
  async handleTaskUpdatedEvent(payload: {
    task: Task;
    updatedBy: number;
    changedFields: Record<string, { oldValue: any; newValue: any }>;
  }) {
    this.logger.log(`📝 Task updated event received: ${payload.task.title} - Fields changed: ${Object.keys(payload.changedFields).join(', ')}`);
    await this.handleEvent('task.updated', payload, (p) => {
        const { task, updatedBy } = p;
        const userIds = task.users?.map((user) => user.id).filter((id) => id !== updatedBy) || [];
        if (task.project?.users) {
            for (const user of task.project.users) {
            if (user.id !== updatedBy && !userIds.includes(user.id)) {
                userIds.push(user.id);
            }
            }
        }
        return userIds;
    });
  }
}



