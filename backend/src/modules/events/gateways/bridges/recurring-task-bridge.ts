import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'socket.io';

export function bridgeRecurringTaskEvents(
  server: Server,
  eventEmitter: EventEmitter2,
  logger: Logger,
): void {
  // Bridge recurring-task.created -> WebSocket
  eventEmitter.on(
    'recurring-task.created',
    (payload: { recurringTask: { id: number } }) => {
      logger.log(
        `Bridging recurring-task.created for task ${payload.recurringTask.id}`,
      );
      server?.to('recurring_tasks_all').emit('recurring-task.created', payload);
    },
  );

  // Bridge recurring-task.updated -> WebSocket
  eventEmitter.on(
    'recurring-task.updated',
    (payload: { recurringTask: { id: number } }) => {
      logger.log(
        `Bridging recurring-task.updated for task ${payload.recurringTask.id}`,
      );
      server?.to('recurring_tasks_all').emit('recurring-task.updated', payload);
    },
  );

  // Bridge recurring-task.deleted -> WebSocket
  eventEmitter.on(
    'recurring-task.deleted',
    (payload: { recurringTaskId: number }) => {
      logger.log(
        `Bridging recurring-task.deleted for task ${payload.recurringTaskId}`,
      );
      server?.to('recurring_tasks_all').emit('recurring-task.deleted', payload);
    },
  );
}
