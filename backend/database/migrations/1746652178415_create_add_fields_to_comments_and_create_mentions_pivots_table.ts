import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'comments'
  protected pivotTableName = 'comment_user_mentions'

  async up() {
    // Altera a tabela 'comments' existente, verificando se as colunas já existem
    this.schema.alterTable(this.tableName, (table) => {
      this.defer(async (db) => {
        const hasParentId = await db.schema.hasColumn(this.tableName, 'parent_id')
        if (!hasParentId) {
          // Adiciona a coluna parent_id apenas se ela não existir
          table
            .integer('parent_id')
            .unsigned()
            .references('id')
            .inTable('comments')
            .onDelete('SET NULL')
            .nullable()
        }

        const hasLikesCount = await db.schema.hasColumn(this.tableName, 'likes_count')
        if (!hasLikesCount) {
          // Adiciona a coluna likes_count apenas se ela não existir
          table.integer('likes_count').notNullable().defaultTo(0)
        }
      })
    })

    // Cria a nova tabela pivot 'comment_user_mentions', verificando se ela já existe
    this.defer(async (db) => {
      const hasPivotTable = await db.schema.hasTable(this.pivotTableName)
      if (!hasPivotTable) {
        this.schema.createTable(this.pivotTableName, (table) => {
          table.increments('id').primary()
          table
            .integer('comment_id')
            .unsigned()
            .references('id')
            .inTable('comments')
            .onDelete('CASCADE')
            .notNullable()
          table
            .integer('user_id')
            .unsigned()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE')
            .notNullable()
          table.timestamp('created_at', { useTz: true })
          table.timestamp('updated_at', { useTz: true })
          table.unique(['comment_id', 'user_id'])
        })
      }
    })
  }

  async down() {
    // Remove a tabela pivot 'comment_user_mentions', verificando se ela existe
    this.defer(async (db) => {
      const hasPivotTable = await db.schema.hasTable(this.pivotTableName)
      if (hasPivotTable) {
        this.schema.dropTable(this.pivotTableName)
      }
    })

    // Reverte as alterações na tabela 'comments', verificando se as colunas existem
    this.schema.alterTable(this.tableName, (table) => {
      this.defer(async (db) => {
        const hasParentId = await db.schema.hasColumn(this.tableName, 'parent_id')
        if (hasParentId) {
          // Remove a chave estrangeira e a coluna parent_id apenas se ela existir
          // A remoção da FK pode variar um pouco dependendo do dialeto SQL exato e como foi nomeada.
          // Para PostgreSQL, o nome da FK é geralmente `comments_parent_id_foreign`
          // Se o dropForeign genérico não funcionar, pode ser necessário um raw query ou nome explícito.
          try {
            table.dropForeign(['parent_id'])
          } catch (error) {
            // A chave estrangeira pode não existir ou ter um nome diferente, o que é esperado em alguns casos.
            // O table.dropColumn('parent_id') tentará remover a coluna de qualquer maneira.
          }
          table.dropColumn('parent_id')
        }

        const hasLikesCount = await db.schema.hasColumn(this.tableName, 'likes_count')
        if (hasLikesCount) {
          // Remove a coluna likes_count apenas se ela existir
          table.dropColumn('likes_count')
        }
      })
    })
  }
}