import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppService } from './services/whatsapp.service';
import { MessageFormatterService } from './factories/message-formatter.factory';
import { WhatsAppController } from './controllers/whatsapp.controller';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [HttpModule, ConfigModule, TypeOrmModule.forFeature([User])],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, MessageFormatterService],
  exports: [WhatsAppService, MessageFormatterService],
})
export class WhatsAppModule {}
