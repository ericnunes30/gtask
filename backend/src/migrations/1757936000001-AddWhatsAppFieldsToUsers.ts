import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddWhatsAppFieldsToUsers1757936000001
  implements MigrationInterface
{
  name = 'AddWhatsAppFieldsToUsers1757936000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna phone_number
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'phone_number',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Adicionar coluna whatsapp_notifications_enabled
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'whatsapp_notifications_enabled',
        type: 'boolean',
        default: false,
      }),
    );

    // Adicionar coluna whatsapp_priority_threshold
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'whatsapp_priority_threshold',
        type: 'varchar',
        default: "'MEDIUM'",
      }),
    );

    // Adicionar coluna whatsapp_quiet_hours_start
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'whatsapp_quiet_hours_start',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Adicionar coluna whatsapp_quiet_hours_end
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'whatsapp_quiet_hours_end',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'phone_number');
    await queryRunner.dropColumn('users', 'whatsapp_notifications_enabled');
    await queryRunner.dropColumn('users', 'whatsapp_priority_threshold');
    await queryRunner.dropColumn('users', 'whatsapp_quiet_hours_start');
    await queryRunner.dropColumn('users', 'whatsapp_quiet_hours_end');
  }
}
