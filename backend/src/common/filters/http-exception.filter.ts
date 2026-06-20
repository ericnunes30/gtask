import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message,
    });
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    console.error(exception); // Log the full exception

    // Capture only server-side errors (>=500) to avoid noise
    try {
      const statusForCapture =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

      if (statusForCapture >= 500) {
        Sentry.withScope((scope) => {
          scope.setTag('component', 'http');
          scope.setTag('method', request.method);
          scope.setTag('path', request.url);
          // Attach shallow context without potentially sensitive body/query
          scope.setExtras({
            headers: {
              'user-agent': request.headers['user-agent'],
              referer: request.headers['referer'],
            },
            ip: request.ip,
          });
          // If authentication attaches user to request, record the id (no PII)
          const reqWithUser = request as Request & { user?: Express.User };
          if (
            reqWithUser.user &&
            (reqWithUser.user.sub || reqWithUser.user.email)
          ) {
            Sentry.setUser({
              id: String(reqWithUser.user.sub ?? reqWithUser.user.email),
            });
          }
          const err =
            exception instanceof Error
              ? exception
              : new Error(
                  typeof exception === 'string' ? exception : 'Unknown error',
                );
          Sentry.captureException(err);
        });
      }
    } catch (sentryErr: unknown) {
      // Avoid throwing from error handler
      console.error('Sentry capture failed:', sentryErr);
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
