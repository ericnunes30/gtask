import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { NotificationService } from './services/notification.service';
import { DebugLoggerService } from './services/debug-logger.service';
import { NotificationController } from './controllers/notification.controller';
import { NotificationFactory } from './factories/notification.factory';
import { StructuredNotificationEntity } from './entities/notification.entity';
import {
  TaskCreatedStrategy,
  TaskStatusUpdatedStrategy,
  CommentCreatedStrategy,
  TimerStartedStrategy,
  TimerPausedStrategy,
  TaskUpdatedStrategy,
} from './strategies';
import type { NotificationStrategy } from './interfaces/notification.types';
import { JwtConfigModule } from '../../config/jwt-module.config';

const strategies: Array<new () => NotificationStrategy> = [
  TaskCreatedStrategy,
  TaskStatusUpdatedStrategy,
  CommentCreatedStrategy,
  TimerStartedStrategy,
  TimerPausedStrategy,
  TaskUpdatedStrategy,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([StructuredNotificationEntity]),
    ConfigModule,
    JwtConfigModule,
  ],
  providers: [
    NotificationService,
    DebugLoggerService,
    NotificationFactory,
    ...strategies,
    {
      provide: 'NOTIFICATION_STRATEGY',
      useFactory: (...strategies: NotificationStrategy[]) => strategies,
      inject: strategies,
    },
  ],
  controllers: [NotificationController],
  exports: [NotificationService, DebugLoggerService, NotificationFactory],
})
export class NotificationModule {}
