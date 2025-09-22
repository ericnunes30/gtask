import { MigrationInterface, QueryRunner } from "typeorm";

export class FixUsersCreatedAtDefault1757936000003 implements MigrationInterface {
    name = 'FixUsersCreatedAtDefault1757936000003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE users 
            ALTER COLUMN created_at 
            SET DEFAULT CURRENT_TIMESTAMP
        `);
        
        await queryRunner.query(`
            ALTER TABLE users 
            ALTER COLUMN updated_at 
            SET DEFAULT CURRENT_TIMESTAMP
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE users 
            ALTER COLUMN created_at 
            DROP DEFAULT
        `);
        
        await queryRunner.query(`
            ALTER TABLE users 
            ALTER COLUMN updated_at 
            DROP DEFAULT
        `);
    }
}