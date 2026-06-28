import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { NotificationService } from '../services/notification.service';
import { DebugLoggerService } from '../services/debug-logger.service';
import {
  StructuredNotification,
  NotificationPagination,
} from '../interfaces/notification.types';
import { NotificationQueryDto } from '../dto/notification-query.dto';
import { NotificationNotFoundException } from '../exceptions/notification-not-found.exception';

// @ApiTags('notifications')
// @ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly debugLogger: DebugLoggerService,
  ) {}

  @Get()
  async getUserNotifications(
    @Query() options: NotificationQueryDto,
    @CurrentUser() currentUser: Express.User,
  ): Promise<NotificationPagination> {
    const userId = currentUser.sub;
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
    @CurrentUser() currentUser: Express.User,
  ): Promise<{ count: number }> {
    const userId = currentUser.sub;
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Get('stats')
  async getUserStats(@CurrentUser() currentUser: Express.User) {
    const userId = currentUser.sub;
    return this.notificationService.getUserStats(userId);
  }

  @Get('search')
  async searchNotifications(
    @Query('q') searchTerm: string,
    @Query() options: NotificationQueryDto = {},
    @CurrentUser() currentUser: Express.User,
  ): Promise<NotificationPagination> {
    const userId = currentUser.sub;
    return this.notificationService.searchNotifications(
      userId,
      searchTerm,
      options,
    );
  }

  @Get(':id')
  async getNotificationById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: Express.User,
  ): Promise<StructuredNotification> {
    const userId = currentUser.sub;
    const notification = await this.notificationService.findById(id, userId);
    if (!notification) {
      throw new NotificationNotFoundException(id);
    }
    return notification;
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: Express.User,
  ): Promise<void> {
    const userId = currentUser.sub;
    await this.notificationService.markAsRead(id, userId);
    this.debugLogger.logNotificationEvent(
      'notification_marked_as_read',
      { id },
      userId,
    );
  }

  @Put('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() currentUser: Express.User): Promise<void> {
    const userId = currentUser.sub;
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
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: Express.User,
  ): Promise<void> {
    const userId = currentUser.sub;
    await this.notificationService.delete(id, userId);
    this.debugLogger.logNotificationEvent(
      'notification_deleted',
      { id },
      userId,
    );
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
