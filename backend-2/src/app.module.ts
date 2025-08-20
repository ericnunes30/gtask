import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USER', 'postgres'),
        password: configService.get('DB_PASSWORD', '123456'),
        database: configService.get('DB_DATABASE', 'manager_group_test'),
        autoLoadEntities: true,
        synchronize: false, // Desabilitado para usar banco existente
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    ProjectModule,
    TaskModule,
    RoleModule,
    OccupationModule,
    RecurringTaskModule,
    ActivityLogModule,
    CommentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
