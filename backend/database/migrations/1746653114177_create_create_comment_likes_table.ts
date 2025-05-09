import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'comment_likes'

  async up() {
    this.defer(async (db) => {
      const hasTable = await db.schema.hasTable(this.tableName)
      if (!hasTable) {
        this.schema.createTable(this.tableName, (table) => {
          table.increments('id').primary()

          table
            .integer('user_id')
            .unsigned()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE')
            .notNullable()

          table
            .integer('comment_id')
            .unsigned()
            .references('id')
            .inTable('comments')
            .onDelete('CASCADE')
            .notNullable()

          table.timestamp('created_at', { useTz: true }).notNullable()
          // Não incluímos updated_at, pois curtidas geralmente não são "editadas"

          // Garante que um usuário só pode curtir um comentário uma vez
          table.unique(['user_id', 'comment_id'])
        })
      }
    })
  }

  async down() {
    this.defer(async (db) => {
      const hasTable = await db.schema.hasTable(this.tableName)
      if (hasTable) {
        this.schema.dropTable(this.tableName)
      }
    })
  }
}