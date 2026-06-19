import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsActiveAndWhatsappToUsers1757936000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'whatsapp',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'whatsapp');
    await queryRunner.dropColumn('users', 'is_active');
  }
}
