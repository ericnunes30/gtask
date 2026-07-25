import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'socket.io';

export function bridgeRoleEvents(
  server: Server,
  eventEmitter: EventEmitter2,
  logger: Logger,
): void {
  // Bridge role.created -> WebSocket
  eventEmitter.on('role.created', (payload: { role: { id: number } }) => {
    logger.log(`Bridging role.created for role ${payload.role.id}`);
    server?.to('roles_all').emit('role.created', payload);
  });

  // Bridge role.updated -> WebSocket
  eventEmitter.on('role.updated', (payload: { role: { id: number } }) => {
    logger.log(`Bridging role.updated for role ${payload.role.id}`);
    server?.to('roles_all').emit('role.updated', payload);
  });

  // Bridge role.deleted -> WebSocket
  eventEmitter.on('role.deleted', (payload: { roleId: number }) => {
    logger.log(`Bridging role.deleted for role ${payload.roleId}`);
    server?.to('roles_all').emit('role.deleted', payload);
  });
}
