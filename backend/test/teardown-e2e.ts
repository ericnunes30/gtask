import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { truncateTables } from './utils/db.utils';

export interface E2EApp {
  app: INestApplication;
  dataSource: DataSource;
}

export async function teardownE2E({ app, dataSource }: E2EApp): Promise<void> {
  await truncateTables(dataSource);
  await app.close();
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}
