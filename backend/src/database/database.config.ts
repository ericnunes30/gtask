import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';

// Carrega variaveis de ambiente do backend/.env quando executado via
// TypeORM CLI (fora do NestJS runtime). Procura em locais comuns.
function loadEnv(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(__dirname, '..', '..', '.env'),
    resolve(__dirname, '..', '.env'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      config({ path });
      return;
    }
  }
}

loadEnv();

export const databaseConfig: TypeOrmModuleOptions & DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  autoLoadEntities: false,
  entities: [resolve(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
  migrations: [resolve(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  migrationsRun: false,
};
