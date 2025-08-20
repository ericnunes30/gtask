import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, ValidateNested, IsArray, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleType, TaskTemplate } from '../entities/recurring-task.entity';
import { PriorityLevel } from '../../tasks/entities/enums';

class TaskTemplateDto implements TaskTemplate {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PriorityLevel)
  priority: PriorityLevel;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  assignee_ids?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  occupation_ids?: number[];

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  due_date?: string;
}

export class CreateRecurringTaskDto {
  @IsString()
  name: string;

  @IsEnum(ScheduleType)
  schedule_type: ScheduleType;

  @IsOptional()
  @IsString()
  frequency_interval?: string;

  @IsOptional()
  @IsString()
  frequency_cron?: string;

  @IsOptional()
  @IsString()
  next_due_date?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsNumber()
  userId: number;

  @IsNumber()
  projectId: number;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => TaskTemplateDto)
  templateData: TaskTemplateDto;
}