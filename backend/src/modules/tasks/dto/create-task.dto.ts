import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsBoolean, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PriorityLevel, Status } from '../entities/enums';

class UsefulLinkDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(500)
  url: string;
}

export class CreateTaskDto {
  @IsOptional()
  @IsNumber()
  order?: number | null;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsEnum(PriorityLevel)
  priority: PriorityLevel;

  @IsEnum(Status)
  status: Status;

  @IsDateString()
  start_date: Date;

  @IsDateString()
  due_date: Date;

  @IsOptional()
  @IsNumber()
  timer?: number;

  @IsNumber()
  project_id: number;

  @IsOptional()
  @IsNumber()
  recurring_task_id?: number | null;

  @IsOptional()
  @IsNumber()
  task_reviewer_id?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  video_url?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UsefulLinkDto)
  useful_links?: UsefulLinkDto[] | null;

  @IsOptional()
  @IsString()
  observations?: string | null;

  @IsOptional()
  @IsBoolean()
  has_detailed_fields?: boolean;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  users?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  occupations?: number[];
}