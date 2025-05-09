import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'activity_logs'

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
            .onDelete('SET NULL') // Mantém o log se o usuário for deletado
            .nullable()

          table
            .integer('task_id')
            .unsigned()
            .references('id')
            .inTable('tasks')
            .onDelete('CASCADE') // Deleta o log se a tarefa for deletada
            .nullable() // Pode haver logs não diretamente ligados a uma tarefa específica

          table.string('action_type').notNullable()
          table.string('changed_field').nullable()
          table.text('old_value').nullable()
          table.text('new_value').nullable()
          table.integer('reference_id').nullable()
          table.json('details').nullable()

          table.timestamp('created_at', { useTz: true }).notNullable()
          // Geralmente não há 'updated_at' para logs de atividade
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