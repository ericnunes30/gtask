import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveUserWhatsAppColumns1785096091000
  implements MigrationInterface
{
  name = 'RemoveUserWhatsAppColumns1785096091000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "whatsapp",
      DROP COLUMN IF EXISTS "whatsapp_notifications_enabled",
      DROP COLUMN IF EXISTS "whatsapp_priority_threshold",
      DROP COLUMN IF EXISTS "whatsapp_quiet_hours_start",
      DROP COLUMN IF EXISTS "whatsapp_quiet_hours_end";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "whatsapp" character varying,
      ADD COLUMN IF NOT EXISTS "whatsapp_notifications_enabled" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "whatsapp_priority_threshold" character varying NOT NULL DEFAULT 'MEDIUM',
      ADD COLUMN IF NOT EXISTS "whatsapp_quiet_hours_start" character varying,
      ADD COLUMN IF NOT EXISTS "whatsapp_quiet_hours_end" character varying;
    `);
  }
}
