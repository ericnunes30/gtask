import {
  IsString,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class WhatsAppConfigDto {
  @IsString()
  apiKey: string;

  @IsString()
  instance: string;

  @IsString()
  baseUrl: string;

  @IsNumber()
  @Min(100)
  @Max(10000)
  delay: number;

  @IsBoolean()
  enabled: boolean;
}

export class UpdateWhatsAppPreferencesDto {
  @IsOptional()
  @IsBoolean()
  whatsappNotificationsEnabled?: boolean;

  @IsOptional()
  @IsString()
  whatsappPriorityThreshold?: string;

  @IsOptional()
  @IsString()
  whatsappQuietHoursStart?: string;

  @IsOptional()
  @IsString()
  whatsappQuietHoursEnd?: string;
}
