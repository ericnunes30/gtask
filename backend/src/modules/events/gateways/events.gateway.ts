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
import {
  bridgeTimerEvents,
  bridgeTaskEvents,
  bridgeProjectEvents,
  bridgeUserEvents,
  bridgeOccupationEvents,
  bridgeRoleEvents,
  bridgeRecurringTaskEvents,
} from './bridges';

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
    bridgeTimerEvents(this.server, this.eventEmitter, this.logger);
    bridgeTaskEvents(this.server, this.eventEmitter, this.logger);
    bridgeProjectEvents(this.server, this.eventEmitter, this.logger);
    bridgeUserEvents(this.server, this.eventEmitter, this.logger);
    bridgeOccupationEvents(this.server, this.eventEmitter, this.logger);
    bridgeRoleEvents(this.server, this.eventEmitter, this.logger);
    bridgeRecurringTaskEvents(this.server, this.eventEmitter, this.logger);
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

  @SubscribeMessage('join-users-room')
  handleJoinUsersRoom(client: Socket) {
    this.logger.log(`Client ${client.id} joining users room`);
    void client.join('users_all');
  }

  @SubscribeMessage('leave-users-room')
  handleLeaveUsersRoom(client: Socket) {
    this.logger.log(`Client ${client.id} leaving users room`);
    void client.leave('users_all');
  }

  @SubscribeMessage('join-occupations-room')
  handleJoinOccupationsRoom(client: Socket) {
    this.logger.log(`Client ${client.id} joining occupations room`);
    void client.join('occupations_all');
  }

  @SubscribeMessage('leave-occupations-room')
  handleLeaveOccupationsRoom(client: Socket) {
    this.logger.log(`Client ${client.id} leaving occupations room`);
    void client.leave('occupations_all');
  }

  @SubscribeMessage('join-roles-room')
  handleJoinRolesRoom(client: Socket) {
    this.logger.log(`Client ${client.id} joining roles room`);
    void client.join('roles_all');
  }

  @SubscribeMessage('leave-roles-room')
  handleLeaveRolesRoom(client: Socket) {
    this.logger.log(`Client ${client.id} leaving roles room`);
    void client.leave('roles_all');
  }

  @SubscribeMessage('join-recurring-tasks-room')
  handleJoinRecurringTasksRoom(client: Socket) {
    this.logger.log(`Client ${client.id} joining recurring tasks room`);
    void client.join('recurring_tasks_all');
  }

  @SubscribeMessage('leave-recurring-tasks-room')
  handleLeaveRecurringTasksRoom(client: Socket) {
    this.logger.log(`Client ${client.id} leaving recurring tasks room`);
    void client.leave('recurring_tasks_all');
  }

  @SubscribeMessage('join-projects-room')
  handleJoinProjectsRoom(client: Socket) {
    this.logger.log(`Client ${client.id} joining projects room`);
    void client.join('projects_all');
  }

  @SubscribeMessage('leave-projects-room')
  handleLeaveProjectsRoom(client: Socket) {
    this.logger.log(`Client ${client.id} leaving projects room`);
    void client.leave('projects_all');
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
