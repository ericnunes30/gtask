import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommentModule } from './modules/comment/comment.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ProjectModule } from './modules/project/project.module';
import { TaskModule } from './modules/tasks/task.module';
import { RoleModule } from './modules/role/role.module';
import { OccupationModule } from './modules/occupation/occupation.module';
import { RecurringTaskModule } from './modules/recurring-task/recurring-task.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { CommandsModule } from './commands/commands.module';
import { EventsModule } from './modules/events/events.module';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.test',
    }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE_TEST', 'manager_group_test'),
        autoLoadEntities: true,
        synchronize: false,
        migrations: ['dist/migrations/*.js'],
        logging: false,
      }),
      inject: [ConfigService],
    }),
    // Carregar módulos de eventos e handlers ANTES dos módulos que emitem eventos
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
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}