import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTaskLocksTable1756370883610 implements MigrationInterface {
    name = 'CreateTaskLocksTable1756370883610'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "task_locks" ("lockKey" character varying(255) NOT NULL, "instanceId" character varying(255) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f3c2cf9f7c47f3657ee64165bd6" PRIMARY KEY ("lockKey"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "task_locks"`);
    }

}
