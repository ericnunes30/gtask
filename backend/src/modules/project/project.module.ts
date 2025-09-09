import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Project } from './entities/project.entity';
import { User } from '../user/entities/user.entity';
import { Occupation } from '../occupation/entities/occupation.entity';
import { ProjectController } from './controllers/project.controller';
import { ProjectService } from './services/project.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, User, Occupation])],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService, TypeOrmModule],
})
export class ProjectModule {}