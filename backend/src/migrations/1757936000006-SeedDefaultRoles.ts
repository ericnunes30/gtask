import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultRoles1757936000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent: only inserts if not exists
    await queryRunner.query(`
      INSERT INTO roles (name, description, created_at, updated_at)
      SELECT 'ADMIN', 'System Administrator', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ADMIN');
    `);
    await queryRunner.query(`
      INSERT INTO roles (name, description, created_at, updated_at)
      SELECT 'USER', 'Standard User', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'USER');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM roles WHERE name IN ('ADMIN', 'USER');`);
  }
}
