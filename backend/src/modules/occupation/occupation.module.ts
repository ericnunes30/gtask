import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Occupation } from './entities/occupation.entity';
import { User } from '../user/entities/user.entity';
import { OccupationController } from './controllers/occupation.controller';
import { OccupationService } from './services/occupation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Occupation, User])],
  controllers: [OccupationController],
  providers: [OccupationService],
  exports: [OccupationService, TypeOrmModule],
})
export class OccupationModule {}