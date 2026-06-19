import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, ValidateNested, IsArray, IsNotEmpty, ArrayMinSize } from 'class-validator';
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

  @IsArray({ message: 'Responsáveis devem ser um array de IDs' })
  @ArrayMinSize(1, { message: 'Pelo menos um responsável deve ser selecionado' })
  @IsNumber({}, { each: true })
  assignee_ids: number[];

  @IsArray({ message: 'Equipes devem ser um array de IDs' })
  @ArrayMinSize(1, { message: 'Pelo menos uma equipe deve ser selecionada' })
  @IsNumber({}, { each: true })
  occupation_ids: number[];

  @IsOptional()
  @IsNumber({}, { message: 'Revisor deve ser um ID de usuário' })
  task_reviewer_id?: number;

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
  projectId: number;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => TaskTemplateDto)
  templateData: TaskTemplateDto;
}