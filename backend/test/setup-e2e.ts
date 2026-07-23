import { resolve } from 'path';

// Load .env.test via dotenv/config BEFORE any NestJS imports
process.env.DOTENV_CONFIG_PATH = resolve(__dirname, '..', '.env.test');
import 'dotenv/config';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AuthenticatedSocketAdapter } from '../src/modules/events/adapters/authenticated-socket.adapter';
import { corsConfig } from '../src/config/cors.config';
import { truncateTables, seedRoles } from './utils/db.utils';

// Bypass ThrottlerGuard for E2E tests
class BypassThrottlerGuard {
  canActivate(): boolean {
    return true;
  }
}

export interface E2EApp {
  app: INestApplication;
  dataSource: DataSource;
}

export async function bootstrapE2E(): Promise<E2EApp> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(ThrottlerGuard)
    .useClass(BypassThrottlerGuard)
    .compile();

  const app = moduleFixture.createNestApplication();

  // WebSocket Adapter
  app.useWebSocketAdapter(new AuthenticatedSocketAdapter(app));

  // Enable CORS
  app.enableCors(corsConfig);

  // Global prefix
  app.setGlobalPrefix(process.env.API_PREFIX || '');

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();

  const dataSource = moduleFixture.get(DataSource);
  await truncateTables(dataSource);
  await seedRoles(dataSource);

  return { app, dataSource };
}
