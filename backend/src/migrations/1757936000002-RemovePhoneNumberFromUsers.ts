import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemovePhoneNumberFromUsers1757936000002
  implements MigrationInterface
{
  name = 'RemovePhoneNumberFromUsers1757936000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remover a coluna phone_number que está causando problemas
    await queryRunner.dropColumn('users', 'phone_number');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-adicionar a coluna se precisar reverter
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'phone_number',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }
}
