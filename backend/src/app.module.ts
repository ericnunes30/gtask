import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { databaseConfig } from './database/database.config';
import { CommonModule } from './common/common.module';
import { CommentModule } from './modules/comment/comment.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ProjectModule } from './modules/project/project.module';
import { TaskModule } from './modules/tasks/task.module';
import { RoleModule } from './modules/role/role.module';
import { OccupationModule } from './modules/occupation/occupation.module';
import { RecurringTaskModule } from './modules/recurring-task/recurring-task.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { CommandsModule } from './commands/commands.module';
import { EventsModule } from './modules/events/events.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PermissionModule } from './modules/permission/permission.module';
import { ExceptionModule } from './modules/exception/exception.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ExceptionModule,
    CommonModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        ...databaseConfig,
        autoLoadEntities: true,
        migrationsRun: true,
        migrations: ['dist/database/migrations/*.js'],
      }),
    }),
    // Carregar módulos de eventos e handlers ANTES dos módulos que emitem eventos
    PermissionModule,
    EventsModule,
    NotificationModule,
    ActivityLogModule,
    // Módulos que emitem eventos devem vir DEPOIS dos handlers
    AuthModule,
    UserModule,
    ProjectModule,
    TaskModule,
    RoleModule,
    OccupationModule,
    RecurringTaskModule,
    CommentModule, // Agora vem DEPOIS dos handlers de eventos
    ScheduleModule.forRoot(),
    SchedulerModule,
    CommandsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
