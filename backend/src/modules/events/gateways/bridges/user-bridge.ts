import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'socket.io';

export function bridgeUserEvents(
  server: Server,
  eventEmitter: EventEmitter2,
  logger: Logger,
): void {
  // Bridge user.created -> WebSocket
  eventEmitter.on('user.created', (payload: { user: { id: number } }) => {
    logger.log(`Bridging user.created for user ${payload.user.id}`);
    server?.to('users_all').emit('user.created', payload);
  });

  // Bridge user.updated -> WebSocket
  eventEmitter.on('user.updated', (payload: { user: { id: number } }) => {
    logger.log(`Bridging user.updated for user ${payload.user.id}`);
    server?.to('users_all').emit('user.updated', payload);
  });

  // Bridge user.deleted -> WebSocket
  eventEmitter.on('user.deleted', (payload: { userId: number }) => {
    logger.log(`Bridging user.deleted for user ${payload.userId}`);
    server?.to('users_all').emit('user.deleted', payload);
  });
}
