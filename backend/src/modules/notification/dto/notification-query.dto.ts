import { IsOptional, IsEnum, IsArray, IsDateString, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { 
  NotificationType, 
  NotificationPriority, 
  NotificationCategory 
} from '../interfaces/notification.types';

export class NotificationQueryDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unreadOnly?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  @Type(() => Array)
  types?: NotificationType[];

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationPriority, { each: true })
  @Type(() => Array)
  priorities?: NotificationPriority[];

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationCategory, { each: true })
  @Type(() => Array)
  categories?: NotificationCategory[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;
}

export class NotificationSearchDto extends NotificationQueryDto {
  @IsOptional()
  @IsArray()
  @Type(() => Array)
  searchTerms?: string[];
}