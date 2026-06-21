import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleType, TaskTemplate } from '../entities/recurring-task.entity';
import { PriorityLevel } from '../../tasks/entities/enums';

class UpdateTaskTemplateDto implements Partial<TaskTemplate> {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PriorityLevel)
  priority?: PriorityLevel;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  assignee_ids?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  occupation_ids?: number[];

  @IsOptional()
  @IsNumber()
  task_reviewer_id?: number;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  due_date?: string;
}

export class UpdateRecurringTaskDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ScheduleType)
  schedule_type?: ScheduleType;

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

  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsNumber()
  projectId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTaskTemplateDto)
  templateData?: UpdateTaskTemplateDto;
}
