import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTasksDatesNullable1757936000004 implements MigrationInterface {
  name = 'FixTasksDatesNullable1757936000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, set any existing NULL values to a default date (e.g., current timestamp)
    await queryRunner.query(`
            UPDATE tasks
            SET start_date = CURRENT_TIMESTAMP
            WHERE start_date IS NULL
        `);

    await queryRunner.query(`
            UPDATE tasks
            SET due_date = CURRENT_TIMESTAMP
            WHERE due_date IS NULL
        `);

    // Then make the columns nullable
    await queryRunner.query(`
            ALTER TABLE tasks
            ALTER COLUMN start_date
            DROP NOT NULL
        `);

    await queryRunner.query(`
            ALTER TABLE tasks
            ALTER COLUMN due_date
            DROP NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: make columns NOT NULL again
    await queryRunner.query(`
            ALTER TABLE tasks
            ALTER COLUMN start_date
            SET NOT NULL
        `);

    await queryRunner.query(`
            ALTER TABLE tasks
            ALTER COLUMN due_date
            SET NOT NULL
        `);
  }
}
