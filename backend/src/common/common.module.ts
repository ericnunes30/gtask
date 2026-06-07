import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../modules/user/entities/user.entity';
import { SetupGuard } from './guards/setup.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [SetupGuard],
  exports: [SetupGuard],
})
export class CommonModule {}
