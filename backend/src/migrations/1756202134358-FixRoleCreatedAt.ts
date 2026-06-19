import { MigrationInterface, QueryRunner } from "typeorm";

export class FixRoleCreatedAt1756202134358 implements MigrationInterface {
    name = 'FixRoleCreatedAt1756202134358'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Simply add createdAt and updatedAt columns to roles table
        await queryRunner.query(`ALTER TABLE "roles" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "roles" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the added columns
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "createdAt"`);
    }

}
