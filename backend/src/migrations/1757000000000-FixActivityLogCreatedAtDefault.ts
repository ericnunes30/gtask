import { MigrationInterface, QueryRunner } from "typeorm";

export class FixActivityLogCreatedAtDefault1757000000000 implements MigrationInterface {
    name = 'FixActivityLogCreatedAtDefault1757000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE activity_logs 
            ALTER COLUMN created_at 
            SET DEFAULT CURRENT_TIMESTAMP
        `);
        
        await queryRunner.query(`
            ALTER TABLE comment_likes 
            ALTER COLUMN created_at 
            SET DEFAULT CURRENT_TIMESTAMP
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE activity_logs 
            ALTER COLUMN created_at 
            DROP DEFAULT
        `);
        
        await queryRunner.query(`
            ALTER TABLE comment_likes 
            ALTER COLUMN created_at 
            DROP DEFAULT
        `);
    }
}