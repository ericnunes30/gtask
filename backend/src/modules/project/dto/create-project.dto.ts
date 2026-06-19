import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  MaxLength,
  IsArray,
  IsInt,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PriorityLevel } from '../../tasks/entities/enums';

/**
 * Validador customizado que aceita tanto YYYY-MM-DD quanto ISO 8601
 */
@ValidatorConstraint({ name: 'isFlexibleDateString', async: false })
export class IsFlexibleDateStringConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any): boolean {
    if (!value) {
      return false;
    }

    // Se for string no formato YYYY-MM-DD
    if (typeof value === 'string') {
      const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (simpleDateRegex.test(value)) {
        // Tenta criar uma data válida
        const date = new Date(value);
        const isValid = !isNaN(date.getTime());
        return isValid;
      }

      // Se for ISO 8601 string
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        const date = new Date(value);
        const isValid = !isNaN(date.getTime());
        return isValid;
      }
    }

    // Se for Date object
    if (value instanceof Date) {
      const isValid = !isNaN(value.getTime());
      return isValid;
    }

    return false;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid date (YYYY-MM-DD or ISO 8601 format)`;
  }
}

/**
 * Decorator de validação que aceita ambos os formatos de data
 */
export function IsFlexibleDateString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFlexibleDateStringConstraint,
    });
  };
}

/**
 * Transforma uma string de data no formato YYYY-MM-DD para ISO 8601
 */
function transformDate(
  value: string | Date | null | undefined,
): string | Date | null | undefined {
  // Se for null ou undefined, retorna como está
  if (value === null || value === undefined) {
    return value;
  }

  // Se já for um objeto Date, converte para ISO string
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Se for string no formato YYYY-MM-DD, converte para ISO 8601
  if (typeof value === 'string') {
    // Verifica se está no formato YYYY-MM-DD
    const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (simpleDateRegex.test(value)) {
      // Cria um Date e converte para ISO 8601 (define como meia-noite UTC)
      const date = new Date(value + 'T00:00:00.000Z');
      return date.toISOString();
    }

    // Se já estiver em formato ISO, retorna como está
    return value;
  }

  return value;
}

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

  @Transform(({ value }) => transformDate(value))
  @IsFlexibleDateString()
  start_date: Date;

  @Transform(({ value }) => transformDate(value))
  @IsFlexibleDateString()
  end_date: Date;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  users?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  teams?: number[];
}
