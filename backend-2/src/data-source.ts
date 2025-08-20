import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USER', 'postgres'),
  password: configService.get('DB_PASSWORD', '123456'),
  database: configService.get('DB_DATABASE', 'manager_group_test'),
  entities: [
    'src/modules/**/entities/*.entity.ts'
  ],
  migrations: [
    'src/migrations/*.ts'
  ],
  synchronize: false,
  migrationsRun: false,
  logging: false,
});