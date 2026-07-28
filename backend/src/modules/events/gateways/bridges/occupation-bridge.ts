import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'socket.io';

export function bridgeOccupationEvents(
  server: Server,
  eventEmitter: EventEmitter2,
  logger: Logger,
): void {
  // Bridge occupation.created -> WebSocket
  eventEmitter.on(
    'occupation.created',
    (payload: { occupation: { id: number } }) => {
      logger.log(
        `Bridging occupation.created for occupation ${payload.occupation.id}`,
      );
      server?.to('occupations_all').emit('occupation.created', payload);
    },
  );

  // Bridge occupation.updated -> WebSocket
  eventEmitter.on(
    'occupation.updated',
    (payload: { occupation: { id: number } }) => {
      logger.log(
        `Bridging occupation.updated for occupation ${payload.occupation.id}`,
      );
      server?.to('occupations_all').emit('occupation.updated', payload);
    },
  );

  // Bridge occupation.deleted -> WebSocket
  eventEmitter.on('occupation.deleted', (payload: { occupationId: number }) => {
    logger.log(
      `Bridging occupation.deleted for occupation ${payload.occupationId}`,
    );
    server?.to('occupations_all').emit('occupation.deleted', payload);
  });

  // Bridge occupation.user.added -> WebSocket
  eventEmitter.on(
    'occupation.user.added',
    (payload: { occupationId: number; userId: number }) => {
      logger.log(
        `Bridging occupation.user.added for occupation ${payload.occupationId}`,
      );
      server?.to('occupations_all').emit('occupation.user.added', payload);
    },
  );

  // Bridge occupation.user.removed -> WebSocket
  eventEmitter.on(
    'occupation.user.removed',
    (payload: { occupationId: number; userId: number }) => {
      logger.log(
        `Bridging occupation.user.removed for occupation ${payload.occupationId}`,
      );
      server?.to('occupations_all').emit('occupation.user.removed', payload);
    },
  );
}
