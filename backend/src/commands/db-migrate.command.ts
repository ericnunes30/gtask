import { Command, CommandRunner } from 'nest-commander';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
@Command({ name: 'db:migrate', description: 'Run pending TypeORM migrations' })
export class DbMigrateCommand extends CommandRunner {
  private readonly logger = new Logger(DbMigrateCommand.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  async run(): Promise<void> {
    this.logger.log('Running database migrations...');
    const results = await this.dataSource.runMigrations();
    results.forEach((r) => this.logger.log(`Executed: ${r.name}`));
    this.logger.log('Migrations complete.');
  }
}
