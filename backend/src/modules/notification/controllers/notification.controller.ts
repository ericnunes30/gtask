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
  async getUserNotifications(
    @Query() options: NotificationQueryDto,
    @Headers('authorization') authorization: string,
  ): Promise<NotificationPagination> {
    const userId = this.getUserIdFromAuth(authorization);
    const result = await this.notificationService.findByUser(userId, options);
    this.debugLogger.logNotificationEvent(
      'notifications_list_returned',
      { total: result.total, page: result.page, pageSize: result.pageSize },
      userId,
    );
    return result;
  }

  @Get('unread-count')
  async getUnreadCount(
    @Headers('authorization') authorization: string,
  ): Promise<{ count: number }> {
    const userId = this.getUserIdFromAuth(authorization);
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Get('stats')
  async getUserStats(@Headers('authorization') authorization: string) {
    const userId = this.getUserIdFromAuth(authorization);
    return this.notificationService.getUserStats(userId);
  }

  @Get(':id')
  async getNotificationById(
    @Param('id') id: number,
    @Headers('authorization') authorization: string,
  ): Promise<StructuredNotification> {
    const userId = this.getUserIdFromAuth(authorization);
    const notification = await this.notificationService.findById(id, userId);
    if (!notification) {
      throw new Error('Notification not found');
    }
    return notification;
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id') id: number,
    @Headers('authorization') authorization: string,
  ): Promise<void> {
    const userId = this.getUserIdFromAuth(authorization);
    await this.notificationService.markAsRead(id, userId);
    this.debugLogger.logNotificationEvent(
      'notification_marked_as_read',
      { id },
      userId,
    );
  }

  @Put('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(
    @Headers('authorization') authorization: string,
  ): Promise<void> {
    const userId = this.getUserIdFromAuth(authorization);
    await this.notificationService.markAllAsRead(userId);
    this.debugLogger.logNotificationEvent(
      'notifications_marked_all_read',
      {},
      userId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @Param('id') id: number,
    @Headers('authorization') authorization: string,
  ): Promise<void> {
    const userId = this.getUserIdFromAuth(authorization);
    await this.notificationService.delete(id, userId);
    this.debugLogger.logNotificationEvent(
      'notification_deleted',
      { id },
      userId,
    );
  }

  @Get('search')
  async searchNotifications(
    @Query('q') searchTerm: string,
    @Query() options: NotificationQueryDto = {},
    @Headers('authorization') authorization: string,
  ): Promise<NotificationPagination> {
    const userId = this.getUserIdFromAuth(authorization);
    return this.notificationService.searchNotifications(
      userId,
      searchTerm,
      options,
    );
  }

  /**
   * Extrai o userId (sub) do header Authorization, validando o JWT.
   * Lancamento centraliza o tratamento de erro (token ausente/invalido/expirado)
   * para evitar repeticao em todos os endpoints.
   */
  private getUserIdFromAuth(authorization: string | undefined): number {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }
    const token = authorization.substring(7);
    try {
      const payload = this.jwtService.verify<{ sub: number }>(token);
      return payload.sub;
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
