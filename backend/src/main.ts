import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpStatus, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { AuthenticatedSocketAdapter } from './modules/events/adapters/authenticated-socket.adapter';
import * as fs from 'fs';

async function bootstrap() {
  console.log('[main.ts] Bootstrap function started.');
  const app = await NestFactory.create(AppModule);

  // WebSocket Adapter for Authentication
  app.useWebSocketAdapter(new AuthenticatedSocketAdapter(app));

  // Enable CORS
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:8082', // Frontend principal
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

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
        const logMessage = `[${new Date().toISOString()}] Validation Error: ${JSON.stringify(errors)}
`;
        fs.appendFileSync('G:/novosApps/manager-group/backend/server.log', logMessage);
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
  
  console.log(`🚀 Application running on: http://localhost:${port}/${process.env.API_PREFIX || 'api/v1'}`);
}
bootstrap();
