import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ActivityLogService } from '../services/activity-log.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ActivityLog } from '../entities/activity-log.entity';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  async getActivityLogs(
    @Query('taskId') taskId?: number,
    @Query('userId') userId?: number,
    @Query('actionType') actionType?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<ActivityLog[]> {
    return this.activityLogService.findAll({
      taskId,
      userId,
      actionType,
      page,
      limit,
    });
  }

  @Get('task/:taskId')
  async getActivityLogsByTask(
    @Param('taskId') taskId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<ActivityLog[]> {
    return this.activityLogService.findByTaskId(taskId, page, limit);
  }
}
