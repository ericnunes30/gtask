/* eslint-disable sonarjs/void-use */
import { Logger, Injectable, OnModuleInit } from '@nestjs/common';
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
import { TimerService } from '../../tasks/services/timer.service';
import { DebugLoggerService } from '../../notification/services/debug-logger.service';
import { StartupVerificationService } from '../services/startup-verification/startup-verification.service';
import { NotificationEventListener } from '../listeners/notification-event.listener';

@WebSocketGateway({
  cors: {
    origin: '*',
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
  server!: Server;

  constructor(
    private readonly timerService: TimerService,
    private readonly debugLogger: DebugLoggerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly startupVerification: StartupVerificationService,
    private readonly notificationEventListener: NotificationEventListener,
  ) {
    this.bridgeTimerEvents();
    this.bridgeTaskEvents();
  }

  private isInitialized = false;

  afterInit() {
    this.notificationEventListener.setServer(this.server);
    this.logger.log('WebSocket server initialized');
  }

  onModuleInit(): void {
    this.logger.log(
      '🚀 EventsGateway initializing - performing startup verification...',
    );
    this.startupVerification.verify();
    this.isInitialized = true;
    this.logger.log('✅ EventsGateway initialization completed successfully');
  }

  private bridgeTimerEvents(): void {
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

  private bridgeTaskEvents(): void {
    // Bridge task.created -> WebSocket
    this.eventEmitter.on(
      'task.created',
      (payload: { task: { id: number; project?: { id: number } }; createdBy: number }) => {
        const projectId = payload.task.project?.id;
        if (projectId) {
          this.logger.log(`Bridging task.created for project ${projectId}`);
          this.server?.to(`project_${projectId}`).emit('task.created', payload);
        }
        this.server?.to('tasks_all').emit('task.created', payload);
      },
    );

    // Bridge task.updated -> WebSocket
    this.eventEmitter.on(
      'task.updated',
      (payload: { task: { id: number; project?: { id: number }; assignee?: { id: number } }; updatedBy: number; changedFields: Record<string, unknown> }) => {
        const projectId = payload.task.project?.id;
        const assigneeId = payload.task.assignee?.id;
        if (projectId) {
          this.logger.log(`Bridging task.updated for project ${projectId}`);
          this.server?.to(`project_${projectId}`).emit('task.updated', payload);
        }
        if (assigneeId) {
          this.server?.to(`user_${assigneeId}`).emit('task.updated', payload);
        }
        this.server?.to('tasks_all').emit('task.updated', payload);
      },
    );

    // Bridge task.status.changed -> WebSocket
    this.eventEmitter.on(
      'task.status.changed',
      (payload: { task: { id: number; project?: { id: number }; assignee?: { id: number } }; updatedBy: number; oldStatus: string; newStatus: string }) => {
        const projectId = payload.task.project?.id;
        const assigneeId = payload.task.assignee?.id;
        if (projectId) {
          this.logger.log(`Bridging task.status.changed for project ${projectId}`);
          this.server?.to(`project_${projectId}`).emit('task.status.changed', payload);
        }
        if (assigneeId) {
          this.server?.to(`user_${assigneeId}`).emit('task.status.changed', payload);
        }
        this.server?.to('tasks_all').emit('task.status.changed', payload);
      },
    );

    // Bridge comment.created -> WebSocket
    this.eventEmitter.on(
      'comment.created',
      (payload: { comment: { task?: { id: number; project?: { id: number } } }; createdBy: number }) => {
        const projectId = payload.comment.task?.project?.id;
        if (projectId) {
          this.logger.log(`Bridging comment.created for project ${projectId}`);
          this.server?.to(`project_${projectId}`).emit('comment.created', payload);
        }
        this.server?.to('tasks_all').emit('comment.created', payload);
      },
    );
  }

  @SubscribeMessage('join-project-room')
  handleJoinProjectRoom(client: Socket, projectId: string) {
    this.logger.log(`Client ${client.id} joining project room: ${projectId}`);
    void client.join(`project_${projectId}`);
  }

  @SubscribeMessage('leave-project-room')
  handleLeaveProjectRoom(client: Socket, projectId: string) {
    this.logger.log(`Client ${client.id} leaving project room: ${projectId}`);
    void client.leave(`project_${projectId}`);
  }

  @SubscribeMessage('join-tasks-room')
  handleJoinTasksRoom(client: Socket) {
    this.logger.log(`Client ${client.id} joining tasks room`);
    void client.join('tasks_all');
  }

  @SubscribeMessage('leave-tasks-room')
  handleLeaveTasksRoom(client: Socket) {
    this.logger.log(`Client ${client.id} leaving tasks room`);
    void client.leave('tasks_all');
  }

  handleConnection(client: Socket, ..._args: unknown[]) {
    const userId = (client as Socket & { user?: Express.User }).user?.sub;

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

  @SubscribeMessage('timer.start')
  async handleTimerStart(client: Socket, payload: { taskId: number }) {
    const userId = (client as Socket & { user?: Express.User }).user?.sub;
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
    } catch (err: unknown) {
      this.logger.error(
        `Failed to start timer for task ${payload.taskId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      client.emit('error', {
        code: 'TIMER_START_FAILED',
        message: 'Unable to start timer',
      });
    }
  }

  @SubscribeMessage('timer.pause')
  async handleTimerPause(client: Socket, payload: { taskId: number }) {
    const userId = (client as Socket & { user?: Express.User }).user?.sub;
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
    } catch (err: unknown) {
      this.logger.error(
        `Failed to pause timer for task ${payload.taskId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      client.emit('error', {
        code: 'TIMER_PAUSE_FAILED',
        message: 'Unable to pause timer',
      });
    }
  }

  @SubscribeMessage('timer.started')
  handleTimerStartedEvent(payload: { taskId: number; userId: number }) {
    this.logger.log(`Broadcasting timer.started for task ${payload.taskId}`);
    void this.server
      .to(`task_${payload.taskId}`)
      .emit('timer.started', payload);
  }

  @SubscribeMessage('timer.paused')
  handleTimerPausedEvent(payload: {
    taskId: number;
    userId: number;
    seconds: number;
  }) {
    this.logger.log(`Broadcasting timer.paused for task ${payload.taskId}`);
    void this.server.to(`task_${payload.taskId}`).emit('timer.paused', payload);
  }

  @SubscribeMessage('timer.tick')
  handleTimerTickEvent(payload: { taskId: number; seconds: number }) {
    void this.server.to(`task_${payload.taskId}`).emit('timer.tick', payload);
  }
}
