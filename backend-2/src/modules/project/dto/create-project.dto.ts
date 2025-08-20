import { IsString, IsOptional, IsBoolean, IsEnum, IsDateString, MaxLength } from 'class-validator';
import { PriorityLevel } from '../../tasks/entities/enums';

export class CreateProjectDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsBoolean()
  status: boolean;

  @IsEnum(PriorityLevel)
  priority: PriorityLevel;

  @IsDateString()
  start_date: Date;

  @IsDateString()
  end_date: Date;
}