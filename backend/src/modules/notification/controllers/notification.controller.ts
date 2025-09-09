import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Patch,
  Headers,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationService } from '../services/notification.service';
import {
  StructuredNotification,
  NotificationPagination
} from '../interfaces/notification.types';
import { NotificationQueryDto } from '../dto/notification-query.dto';

// @ApiTags('notifications')
// @ApiBearerAuth()
@Controller('notifications')
// @UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  // @ApiOperation({ summary: 'Buscar notificações estruturadas do usuário' })
  // @ApiResponse({ status: 200, description: 'Lista de notificações com paginação' })
  // @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getUserNotifications(
    @Request() req,
    @Query() options: NotificationQueryDto,
    @Headers('authorization') authorization: string
  ): Promise<NotificationPagination> {
    // Verificar manualmente o token JWT
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }
    
    const token = authorization.substring(7); // Remove "Bearer " prefix
    
    try {
      const payload = this.jwtService.verify(token);
      return await this.notificationService.findByUser(payload.sub, options);
    } catch (jwtError) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  @Get('unread-count')
  // @ApiOperation({ summary: 'Contar notificações não lidas' })
  // @ApiResponse({ status: 200, description: 'Número de notificações não lidas' })
  async getUnreadCount(
    @Request() req
  ): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(req.user.id);
    return { count };
  }

  @Get('stats')
  // @ApiOperation({ summary: 'Obter estatísticas de notificações do usuário' })
  // @ApiResponse({ status: 200, description: 'Estatísticas detalhadas' })
  async getUserStats(@Request() req) {
    return this.notificationService.getUserStats(req.user.id);
  }

  @Get(':id')
  // @ApiOperation({ summary: 'Buscar notificação específica' })
  // @ApiResponse({ status: 200, description: 'Notificação encontrada' })
  // @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async getNotificationById(
    @Request() req,
    @Param('id') id: number
  ): Promise<StructuredNotification> {
    const notification = await this.notificationService.findById(id, req.user.id);
    if (!notification) {
      throw new Error('Notification not found');
    }
    return notification;
  }

  @Put(':id/read')
  // @ApiOperation({ summary: 'Marcar notificação como lida' })
  // @ApiResponse({ status: 200, description: 'Notificação marcada como lida' })
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Request() req,
    @Param('id') id: number
  ): Promise<void> {
    await this.notificationService.markAsRead(id, req.user.id);
  }

  @Put('read-all')
  // @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  // @ApiResponse({ status: 200, description: 'Todas as notificações marcadas como lidas' })
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Request() req): Promise<void> {
    await this.notificationService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  // @ApiOperation({ summary: 'Excluir notificação' })
  // @ApiResponse({ status: 200, description: 'Notificação excluída' })
  // @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @Request() req,
    @Param('id') id: number
  ): Promise<void> {
    await this.notificationService.delete(id, req.user.id);
  }

  @Get('search')
  // @ApiOperation({ summary: 'Buscar notificações com termo de busca' })
  // @ApiResponse({ status: 200, description: 'Resultados da busca' })
  async searchNotifications(
    @Request() req,
    @Query('q') searchTerm: string,
    @Query() options: NotificationQueryDto = {}
  ): Promise<NotificationPagination> {
    return this.notificationService.searchNotifications(req.user.id, searchTerm, options);
  }

  // Endpoints administrativos
  @Get('admin/cleanup')
  // @ApiOperation({ summary: 'Limpar notificações expiradas (admin)' })
  // @ApiResponse({ status: 200, description: 'Limpeza concluída' })
  async cleanupExpired(): Promise<{ message: string }> {
    await this.notificationService.deleteExpired();
    return { message: 'Expired notifications cleaned up successfully' };
  }

  @Post('admin/cleanup-old')
  // @ApiOperation({ summary: 'Limpar notificações antigas (admin)' })
  // @ApiResponse({ status: 200, description: 'Limpeza concluída' })
  async cleanupOldNotifications(
    @Body('daysToKeep') daysToKeep: number = 90
  ): Promise<{ message: string; deletedCount: number }> {
    const deletedCount = await this.notificationService.cleanupOldNotifications(daysToKeep);
    return {
      message: 'Old notifications cleaned up successfully',
      deletedCount
    };
  }
}