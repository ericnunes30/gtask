import {
  Catch,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { HttpErrorResponse } from '../types/http-error-response.type';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorContext = this.resolveErrorContext(exception);

    const body: HttpErrorResponse = {
      success: false,
      statusCode: errorContext.statusCode,
      error: errorContext.error,
      code: errorContext.code,
      message: errorContext.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (errorContext.details !== undefined) {
      body.details = errorContext.details;
    }

    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      body.stack = exception.stack;
    }

    response.status(errorContext.statusCode).json(body);
  }

  private resolveErrorContext(exception: unknown): {
    statusCode: number;
    error: string;
    code: string;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const responseData = exception.getResponse();
      let message = exception.message;
      let details: unknown;

      if (typeof responseData === 'string') {
        message = responseData;
      } else if (typeof responseData === 'object' && responseData !== null) {
        const data = responseData as Record<string, unknown>;
        message =
          typeof data.message === 'string' ? data.message : exception.message;
        details = data.details;
      }

      return {
        statusCode,
        error: exception.name,
        code: exception.constructor.name,
        message,
        details,
      };
    }

    if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as
        | { code?: string }
        | undefined;
      const errorCode =
        driverError?.code ?? (exception as unknown as { code?: string }).code;

      if (errorCode === '23505') {
        return {
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          code: 'ConflictException',
          message: 'Resource already exists',
        };
      }

      if (errorCode === '23503') {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          code: 'BadRequestException',
          message: 'Foreign key constraint violation',
        };
      }

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        code: 'QueryFailedError',
        message: 'Database error',
      };
    }

    if (exception instanceof EntityNotFoundError) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        code: 'NotFoundException',
        message: 'Resource not found',
      };
    }

    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      code: 'InternalServerErrorException',
      message,
    };
  }
}
