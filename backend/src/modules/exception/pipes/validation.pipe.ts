import {
  HttpStatus,
  UnprocessableEntityException,
  ValidationPipe as NestValidationPipe,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { formatValidationErrors } from '../formatters/validation-error.formatter';

export class GlobalValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (errors: ValidationError[]) => {
        return new UnprocessableEntityException({
          message: 'Validation failed',
          details: formatValidationErrors(errors),
        });
      },
    });
  }
}
