import { corsConfig } from './config/cors.config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpStatus, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { AuthenticatedSocketAdapter } from './modules/events/adapters/authenticated-socket.adapter';
import * as fs from 'fs';
import { initSentry } from './config/sentry.config';

async function bootstrap() {
  console.log('[main.ts] Bootstrap function started.');
  // Initialize Sentry (no-op if SENTRY_DSN is not set)
  initSentry();
  const app = await NestFactory.create(AppModule);

  // WebSocket Adapter for Authentication
  app.useWebSocketAdapter(new AuthenticatedSocketAdapter(app));

  // Enable CORS
  app.enableCors(corsConfig);

  // Global prefix
  app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      validationError: { target: false, value: false },
      exceptionFactory: (errors) => {
        console.error('Validation errors:', errors);
        // Add logging to server.log
        const logMessage = `[${new Date().toISOString()}] Validation Error: ${JSON.stringify(errors)}\n`;
        const logPath = process.env.LOG_FILE || 'server.log';
        fs.appendFileSync(logPath, logMessage);
        return new BadRequestException(errors);
      },
    }),
  );

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3334;
  console.log(`[main.ts] Application about to listen on port ${port}.`);
  await app.listen(port);

  console.log(`Application running on: http://localhost:${port}/${process.env.API_PREFIX || 'api/v1'}`);
}
bootstrap();
