import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

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
} from './factories/strategies';
import type { NotificationStrategy } from './interfaces/notification.types';

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
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
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
