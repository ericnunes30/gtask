import { IsEnum, IsNumber, IsOptional, IsBoolean, IsObject, IsDateString, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  TaskCreatedData,
  TaskStatusUpdatedData,
  CommentCreatedData,
  TaskUpdatedData
} from '../interfaces/notification.types';

// DTOs para os novos formatos de dados
export class TaskCreatedDataDto implements TaskCreatedData {
  @IsString()
  actorName: string;

  @IsString()
  taskTitle: string;

  @IsOptional()
  @IsString()
  projectTitle?: string;
}

export class TaskStatusUpdatedDataDto implements TaskStatusUpdatedData {
  @IsString()
  actorName: string;

  @IsString()
  taskTitle: string;

  @IsString()
  oldStatus: string;

  @IsString()
  newStatus: string;
}

export class CommentCreatedDataDto implements CommentCreatedData {
  @IsString()
  actorName: string;

  @IsString()
  taskTitle: string;

  @IsString()
  commentSnippet: string;
}

export class TaskUpdatedDataDto implements TaskUpdatedData {
  @IsString()
  actorName: string;

  @IsString()
  taskTitle: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChangedFieldDto)
  changedFields: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;
}

class ChangedFieldDto {
  @IsString()
  field: string;

  @IsString()
  oldValue: string;

  @IsString()
  newValue: string;
}

// Tipo para o campo data que pode ser a estrutura antiga ou as novas estruturas
type NotificationDataDto = 
  | {
      entityType: string;
      entityId: number;
      action: string;
      changes?: Record<string, any>;
      relatedEntities?: Array<{
        type: string;
        id: number;
        name?: string;
        metadata?: Record<string, any>;
        avatar?: string;
      }>;
      context?: {
        performer?: {
          id: number;
          name: string;
          email?: string;
          avatar?: string;
        };
        timestamp: string;
        source: string;
        additionalData?: Record<string, any>;
      };
    }
  | TaskCreatedDataDto
  | TaskStatusUpdatedDataDto
  | CommentCreatedDataDto
  | TaskUpdatedDataDto;

export class CreateNotificationDto {
  @IsNumber()
  userId: number;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @IsObject()
  data: NotificationDataDto;

  @IsObject()
  metadata: {
    source: string;
    category: NotificationCategory;
    tags: string[];
    version: string;
    correlationId?: string;
    parentNotificationId?: number;
  };

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsDateString()
  deliveredAt?: string;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsDateString()
  readAt?: string;
}