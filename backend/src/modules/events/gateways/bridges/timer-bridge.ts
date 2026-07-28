import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'socket.io';

export function bridgeTimerEvents(
  server: Server,
  eventEmitter: EventEmitter2,
  logger: Logger,
): void {
  eventEmitter.on(
    'timer.started',
    (payload: { taskId: number; userId: number }) => {
      logger.log(`Bridging timer.started for task ${payload.taskId}`);
      server?.to(`task_${payload.taskId}`).emit('timer.started', payload);
    },
  );
  eventEmitter.on(
    'timer.paused',
    (payload: { taskId: number; seconds: number; userId?: number }) => {
      server?.to(`task_${payload.taskId}`).emit('timer.paused', payload);
    },
  );
  eventEmitter.on(
    'timer.tick',
    (payload: { taskId: number; seconds: number }) => {
      server?.to(`task_${payload.taskId}`).emit('timer.tick', payload);
    },
  );
}
