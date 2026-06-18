import { Controller, Get, Post, Body, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { WhatsAppService } from '../services/whatsapp.service';
import { WhatsAppConfigDto } from '../dto/whatsapp-config.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { WhatsAppConfig, WhatsAppResponse } from '../interfaces/whatsapp.types';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('config')
  async getConfig(): Promise<WhatsAppConfig> {
    return this.whatsappService.getConfig();
  }

  @Post('config')
  @HttpCode(HttpStatus.OK)
  async updateConfig(@Body() config: WhatsAppConfigDto): Promise<void> {
    await this.whatsappService.updateConfig(config);
  }

  @Post('send')
  async sendMessage(@Body() sendMessageDto: SendMessageDto): Promise<WhatsAppResponse> {
    return this.whatsappService.sendMessage(sendMessageDto.number, sendMessageDto.text);
  }
}