import { IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateOccupationDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}