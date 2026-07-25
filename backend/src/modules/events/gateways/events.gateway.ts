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
    this.bridgeProjectEvents();
    this.bridgeUserEvents();
    this.bridgeOccupationEvents();
    this.bridgeRoleEvents();
    this.bridgeRecurringTaskEvents();
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

    // Bridge task.assignees.updated -> WebSocket
    this.eventEmitter.on(
      'task.assignees.updated',
      (payload: { taskId: number; projectId?: number; assigneeIds: number[] }) => {
        this.logger.log(`Bridging task.assignees.updated for task ${payload.taskId}`);
        if (payload.projectId) {
          this.server?.to(`project_${payload.projectId}`).emit('task.assignees.updated', payload);
        }
        for (const userId of payload.assigneeIds) {
          this.server?.to(`user_${userId}`).emit('task.assignees.updated', payload);
        }
        this.server?.to('tasks_all').emit('task.assignees.updated', payload);
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

    // Bridge comment.updated -> WebSocket
    this.eventEmitter.on(
      'comment.updated',
      (payload: { comment: { task?: { id: number; project?: { id: number } } } }) => {
        const projectId = payload.comment.task?.project?.id;
        if (projectId) {
          this.logger.log(`Bridging comment.updated for project ${projectId}`);
          this.server?.to(`project_${projectId}`).emit('comment.updated', payload);
        }
        this.server?.to('tasks_all').emit('comment.updated', payload);
      },
    );

    // Bridge comment.deleted -> WebSocket
    this.eventEmitter.on(
      'comment.deleted',
      (payload: { commentId: number; taskId?: number }) => {
        this.logger.log(`Bridging comment.deleted for comment ${payload.commentId}`);
        this.server?.to('tasks_all').emit('comment.deleted', payload);
      },
    );
  }

  private bridgeProjectEvents(): void {
    // Bridge project.created -> WebSocket
    this.eventEmitter.on(
      'project.created',
      (payload: { project: { id: number } }) => {
        this.logger.log(`Bridging project.created for project ${payload.project.id}`);
        this.server?.to('projects_all').emit('project.created', payload);
      },
    );

    // Bridge project.updated -> WebSocket
    this.eventEmitter.on(
      'project.updated',
      (payload: { project: { id: number } }) => {
        this.logger.log(`Bridging project.updated for project ${payload.project.id}`);
        this.server?.to('projects_all').emit('project.updated', payload);
        this.server?.to(`project_${payload.project.id}`).emit('project.updated', payload);
      },
    );

    // Bridge project.deleted -> WebSocket
    this.eventEmitter.on(
      'project.deleted',
      (payload: { projectId: number }) => {
        this.logger.log(`Bridging project.deleted for project ${payload.projectId}`);
        this.server?.to('projects_all').emit('project.deleted', payload);
        this.server?.to(`project_${payload.projectId}`).emit('project.deleted', payload);
      },
    );
  }

  private bridgeUserEvents(): void {
    // Bridge user.created -> WebSocket
    this.eventEmitter.on(
      'user.created',
      (payload: { user: { id: number } }) => {
        this.logger.log(`Bridging user.created for user ${payload.user.id}`);
        this.server?.to('users_all').emit('user.created', payload);
      },
    );

    // Bridge user.updated -> WebSocket
    this.eventEmitter.on(
      'user.updated',
      (payload: { user: { id: number } }) => {
        this.logger.log(`Bridging user.updated for user ${payload.user.id}`);
        this.server?.to('users_all').emit('user.updated', payload);
      },
    );

    // Bridge user.deleted -> WebSocket
    this.eventEmitter.on(
      'user.deleted',
      (payload: { userId: number }) => {
        this.logger.log(`Bridging user.deleted for user ${payload.userId}`);
        this.server?.to('users_all').emit('user.deleted', payload);
      },
    );
  }

  private bridgeOccupationEvents(): void {
    // Bridge occupation.created -> WebSocket
    this.eventEmitter.on(
      'occupation.created',
      (payload: { occupation: { id: number } }) => {
        this.logger.log(`Bridging occupation.created for occupation ${payload.occupation.id}`);
        this.server?.to('occupations_all').emit('occupation.created', payload);
      },
    );

    // Bridge occupation.updated -> WebSocket
    this.eventEmitter.on(
      'occupation.updated',
      (payload: { occupation: { id: number } }) => {
        this.logger.log(`Bridging occupation.updated for occupation ${payload.occupation.id}`);
        this.server?.to('occupations_all').emit('occupation.updated', payload);
      },
    );

    // Bridge occupation.deleted -> WebSocket
    this.eventEmitter.on(
      'occupation.deleted',
      (payload: { occupationId: number }) => {
        this.logger.log(`Bridging occupation.deleted for occupation ${payload.occupationId}`);
        this.server?.to('occupations_all').emit('occupation.deleted', payload);
      },
    );

    // Bridge occupation.user.added -> WebSocket
    this.eventEmitter.on(
      'occupation.user.added',
      (payload: { occupationId: number; userId: number }) => {
        this.logger.log(`Bridging occupation.user.added for occupation ${payload.occupationId}`);
        this.server?.to('occupations_all').emit('occupation.user.added', payload);
      },
    );

    // Bridge occupation.user.removed -> WebSocket
    this.eventEmitter.on(
      'occupation.user.removed',
      (payload: { occupationId: number; userId: number }) => {
        this.logger.log(`Bridging occupation.user.removed for occupation ${payload.occupationId}`);
        this.server?.to('occupations_all').emit('occupation.user.removed', payload);
      },
    );
  }

  private bridgeRoleEvents(): void {
    // Bridge role.created -> WebSocket
    this.eventEmitter.on(
      'role.created',
      (payload: { role: { id: number } }) => {
        this.logger.log(`Bridging role.created for role ${payload.role.id}`);
        this.server?.to('roles_all').emit('role.created', payload);
      },
    );

    // Bridge role.updated -> WebSocket
    this.eventEmitter.on(
      'role.updated',
      (payload: { role: { id: number } }) => {
        this.logger.log(`Bridging role.updated for role ${payload.role.id}`);
        this.server?.to('roles_all').emit('role.updated', payload);
      },
    );

    // Bridge role.deleted -> WebSocket
    this.eventEmitter.on(
      'role.deleted',
      (payload: { roleId: number }) => {
        this.logger.log(`Bridging role.deleted for role ${payload.roleId}`);
        this.server?.to('roles_all').emit('role.deleted', payload);
      },
    );
  }

  private bridgeRecurringTaskEvents(): void {
    // Bridge recurring-task.created -> WebSocket
    this.eventEmitter.on(
      'recurring-task.created',
      (payload: { recurringTask: { id: number } }) => {
        this.logger.log(`Bridging recurring-task.created for task ${payload.recurringTask.id}`);
        this.server?.to('recurring_tasks_all').emit('recurring-task.created', payload);
      },
    );

    // Bridge recurring-task.updated -> WebSocket
    this.eventEmitter.on(
      'recurring-task.updated',
      (payload: { recurringTask: { id: number } }) => {
        this.logger.log(`Bridging recurring-task.updated for task ${payload.recurringTask.id}`);
        this.server?.to('recurring_tasks_all').emit('recurring-task.updated', payload);
      },
    );

    // Bridge recurring-task.deleted -> WebSocket
    this.eventEmitter.on(
      'recurring-task.deleted',
      (payload: { recurringTaskId: number }) => {
        this.logger.log(`Bridging recurring-task.deleted for task ${payload.recurringTaskId}`);
        this.server?.to('recurring_tasks_all').emit('recurring-task.deleted', payload);
      },
    );
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
