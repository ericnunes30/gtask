import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTaskOrderToFloat1784979011000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tasks ALTER COLUMN "order" TYPE real
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tasks ALTER COLUMN "order" TYPE integer
    `);
  }
}
