import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Request,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationService } from '../services/notification.service';
import { DebugLoggerService } from '../services/debug-logger.service';
import {
  StructuredNotification,
  NotificationPagination,
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
    private readonly debugLogger: DebugLoggerService,
  ) {}

  @Get()
  // @ApiOperation({ summary: 'Buscar notificações estruturadas do usuário' })
  // @ApiResponse({ status: 200, description: 'Lista de notificações com paginação' })
  // @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getUserNotifications(
    @Request() req,
    @Query() options: NotificationQueryDto,
    @Headers('authorization') authorization: string,
  ): Promise<NotificationPagination> {
    // Verificar manualmente o token JWT
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }

    const token = authorization.substring(7); // Remove "Bearer " prefix

    try {
      const payload = this.jwtService.verify(token);
      this.debugLogger.logNotificationEvent(
        'notifications_list_requested',
        { options },
        payload.sub,
      );
      const result = await this.notificationService.findByUser(
        payload.sub,
        options,
      );
      this.debugLogger.logNotificationEvent(
        'notifications_list_returned',
        { total: result.total, page: result.page, pageSize: result.pageSize },
        payload.sub,
      );
      return result;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  @Get('unread-count')
  // @ApiOperation({ summary: 'Contar notificações não lidas' })
  // @ApiResponse({ status: 200, description: 'Número de notificações não lidas' })
  async getUnreadCount(
    @Headers('authorization') authorization: string,
  ): Promise<{ count: number }> {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }
    const token = authorization.substring(7);
    try {
      const payload = this.jwtService.verify(token);
      const count = await this.notificationService.getUnreadCount(payload.sub);
      return { count };
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  @Get('stats')
  // @ApiOperation({ summary: 'Obter estatísticas de notificações do usuário' })
  // @ApiResponse({ status: 200, description: 'Estatísticas detalhadas' })
  async getUserStats(@Headers('authorization') authorization: string) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }
    const token = authorization.substring(7);
    try {
      const payload = this.jwtService.verify(token);
      return this.notificationService.getUserStats(payload.sub);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  @Get(':id')
  // @ApiOperation({ summary: 'Buscar notificação específica' })
  // @ApiResponse({ status: 200, description: 'Notificação encontrada' })
  // @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async getNotificationById(
    @Param('id') id: number,
    @Headers('authorization') authorization: string,
  ): Promise<StructuredNotification> {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }
    const token = authorization.substring(7);
    try {
      const payload = this.jwtService.verify(token);
      const notification = await this.notificationService.findById(
        id,
        payload.sub,
      );
      if (!notification) {
        throw new Error('Notification not found');
      }
      return notification;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  @Put(':id/read')
  // @ApiOperation({ summary: 'Marcar notificação como lida' })
  // @ApiResponse({ status: 200, description: 'Notificação marcada como lida' })
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id') id: number,
    @Headers('authorization') authorization: string,
  ): Promise<void> {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }
    const token = authorization.substring(7);
    try {
      const payload = this.jwtService.verify(token);
      await this.notificationService.markAsRead(id, payload.sub);
      this.debugLogger.logNotificationEvent(
        'notification_marked_as_read',
        { id },
        payload.sub,
      );
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  @Put('read-all')
  // @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  // @ApiResponse({ status: 200, description: 'Todas as notificações marcadas como lidas' })
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(
    @Headers('authorization') authorization: string,
  ): Promise<void> {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }
    const token = authorization.substring(7);
    try {
      const payload = this.jwtService.verify(token);
      await this.notificationService.markAllAsRead(payload.sub);
      this.debugLogger.logNotificationEvent(
        'notifications_marked_all_read',
        {},
        payload.sub,
      );
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  @Delete(':id')
  // @ApiOperation({ summary: 'Excluir notificação' })
  // @ApiResponse({ status: 200, description: 'Notificação excluída' })
  // @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @Param('id') id: number,
    @Headers('authorization') authorization: string,
  ): Promise<void> {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }
    const token = authorization.substring(7);
    try {
      const payload = this.jwtService.verify(token);
      await this.notificationService.delete(id, payload.sub);
      this.debugLogger.logNotificationEvent(
        'notification_deleted',
        { id },
        payload.sub,
      );
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  @Get('search')
  // @ApiOperation({ summary: 'Buscar notificações com termo de busca' })
  // @ApiResponse({ status: 200, description: 'Resultados da busca' })
  async searchNotifications(
    @Query('q') searchTerm: string,
    @Query() options: NotificationQueryDto = {},
    @Headers('authorization') authorization: string,
  ): Promise<NotificationPagination> {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }
    const token = authorization.substring(7);
    try {
      const payload = this.jwtService.verify(token);
      return this.notificationService.searchNotifications(
        payload.sub,
        searchTerm,
        options,
      );
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
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
    @Body('daysToKeep') daysToKeep: number = 90,
  ): Promise<{ message: string; deletedCount: number }> {
    const deletedCount =
      await this.notificationService.cleanupOldNotifications(daysToKeep);
    return {
      message: 'Old notifications cleaned up successfully',
      deletedCount,
    };
  }
}
