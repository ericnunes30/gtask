import { MigrationInterface, QueryRunner } from "typeorm";

export class EmptyValidationMigration1755687676971 implements MigrationInterface {
    name = 'EmptyValidationMigration1755687676971'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Migration vazia para validação
        // Esta migration serve apenas para marcar que o banco de dados
        // está sincronizado com as definições atuais das entities
        // sem realizar nenhuma alteração real no schema
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Migration de rollback vazia
        // Não há alterações para reverter
    }
}