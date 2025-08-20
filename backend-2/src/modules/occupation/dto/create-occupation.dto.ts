import { IsString, MaxLength } from 'class-validator';

export class CreateOccupationDto {
  @IsString()
  @MaxLength(255)
  name: string;
}