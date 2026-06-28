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
  validate(value: unknown): boolean {
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
 * Transforma uma string de data no formato YYYY-MM-DD para ISO 8601.
 * Aceita `unknown` (entrada de class-transformer) e retorna o tipo adequado
 * ou `null/undefined` quando o input e vazio.
 */
// eslint-disable-next-line sonarjs/function-return-type
function transformDate(value: unknown): string | Date | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  // Se ja for Date, converte para ISO string
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Se for string
  if (typeof value === 'string') {
    // YYYY-MM-DD -> ISO 8601
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(value + 'T00:00:00.000Z').toISOString();
    }
    // Ja em formato ISO ou outro formato parseavel
    return new Date(value);
  }

  // Outros tipos (number, boolean, object): tenta converter para Date,
  // caso contrario retorna string vazia
  return '';
}

export class CreateProjectDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsBoolean()
  status!: boolean;

  @IsEnum(PriorityLevel)
  priority!: PriorityLevel;

  @Transform(({ value }: { value: unknown }) => transformDate(value))
  @IsFlexibleDateString()
  start_date!: Date;

  @Transform(({ value }: { value: unknown }) => transformDate(value))
  @IsFlexibleDateString()
  end_date!: Date;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  users?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  teams?: number[];
}
