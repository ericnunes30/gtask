import { corsConfig } from './config/cors.config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuthenticatedSocketAdapter } from './modules/events/adapters/authenticated-socket.adapter';
import { initSentry } from './config/sentry.config';

async function bootstrap() {
  Logger.log('[main.ts] Bootstrap function started.');
  // Initialize Sentry (no-op if SENTRY_DSN is not set)
  initSentry();
  const app = await NestFactory.create(AppModule);

  // WebSocket Adapter for Authentication
  app.useWebSocketAdapter(new AuthenticatedSocketAdapter(app));

  // Enable CORS
  app.enableCors(corsConfig);

  // Global prefix
  app.setGlobalPrefix(process.env.API_PREFIX || '');

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global filters and pipes are registered via ExceptionModule

  const port = process.env.PORT || 3334;
  Logger.log(`[main.ts] Application about to listen on port ${port}.`);
  await app.listen(port);

  Logger.log(
    `Application running on: http://localhost:${port}/${process.env.API_PREFIX || 'api/v1'}`,
  );
}
void bootstrap();
