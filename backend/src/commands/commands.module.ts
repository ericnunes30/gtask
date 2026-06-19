import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FindTestDataCommand } from './find-test-data.command';
import { DbMigrateCommand } from './db-migrate.command';
import { User } from '../modules/user/entities/user.entity';
import { Project } from '../modules/project/entities/project.entity';
import { Occupation } from '../modules/occupation/entities/occupation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Project, Occupation])],
  providers: [FindTestDataCommand, DbMigrateCommand],
})
export class CommandsModule {}
