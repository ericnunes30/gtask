import { PartialType, OmitType } from '@nestjs/mapped-types';
import { ValidateNested, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateRecurringTaskDto,
  TaskTemplateDto,
} from './create-recurring-task.dto';

export class UpdateTaskTemplateDto extends PartialType(TaskTemplateDto) {}

export class UpdateRecurringTaskDto extends PartialType(
  OmitType(CreateRecurringTaskDto, ['templateData'] as const),
) {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTaskTemplateDto)
  templateData?: UpdateTaskTemplateDto;
}
