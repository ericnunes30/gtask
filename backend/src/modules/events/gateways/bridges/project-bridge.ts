import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'socket.io';

export function bridgeProjectEvents(
  server: Server,
  eventEmitter: EventEmitter2,
  logger: Logger,
): void {
  // Bridge project.created -> WebSocket
  eventEmitter.on('project.created', (payload: { project: { id: number } }) => {
    logger.log(`Bridging project.created for project ${payload.project.id}`);
    server?.to('projects_all').emit('project.created', payload);
  });

  // Bridge project.updated -> WebSocket
  eventEmitter.on('project.updated', (payload: { project: { id: number } }) => {
    logger.log(`Bridging project.updated for project ${payload.project.id}`);
    server?.to('projects_all').emit('project.updated', payload);
    server
      ?.to(`project_${payload.project.id}`)
      .emit('project.updated', payload);
  });

  // Bridge project.deleted -> WebSocket
  eventEmitter.on('project.deleted', (payload: { projectId: number }) => {
    logger.log(`Bridging project.deleted for project ${payload.projectId}`);
    server?.to('projects_all').emit('project.deleted', payload);
    server?.to(`project_${payload.projectId}`).emit('project.deleted', payload);
  });
}
