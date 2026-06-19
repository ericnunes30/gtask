import { Command, CommandRunner } from 'nest-commander';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
@Command({
  name: 'db:migrate:status',
  description: 'Show migration status - pending and executed',
})
export class DbMigrateStatusCommand extends CommandRunner {
  private readonly logger = new Logger(DbMigrateStatusCommand.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  async run(): Promise<void> {
    try {
      this.logger.log('📊 Database Migration Status');
      this.logger.log('='.repeat(50));

      // Check if migrations table exists
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      try {
        // Get executed migrations
        const executedMigrations = await queryRunner.query(
          `SELECT * FROM migrations ORDER BY "timestamp" DESC`,
        );

        this.logger.log(
          `\n✅ Executed migrations (${executedMigrations.length}):`,
        );
        if (executedMigrations.length > 0) {
          executedMigrations.forEach((migration: any) => {
            this.logger.log(
              `  ✓ ${migration.name} - ${new Date(migration.timestamp).toISOString()}`,
            );
          });
        } else {
          this.logger.log('  No migrations executed yet');
        }

        // Check for pending migrations
        const pendingMigrations = await this.dataSource.showMigrations();
        this.logger.log(
          `\n⏳ Pending migrations: ${pendingMigrations ? 'YES' : 'NO'}`,
        );

        if (pendingMigrations) {
          this.logger.log(
            '  Run "npm run db:migrate" to execute pending migrations',
          );
        }
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error('❌ Failed to get migration status:', error.message);
      this.logger.debug('Error details:', error.stack);
      throw error;
    }
  }
}
