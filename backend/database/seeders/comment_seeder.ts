import Comment from '#models/comment'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Task from '#models/task'
import logger from '@adonisjs/core/services/logger'

export default class CommentSeeder extends BaseSeeder {
  async run() {
    logger.info('CommentSeeder: Iniciando criação/verificação de comentários.')
    try {
      // Buscar usuários
      const developer = await User.findBy('email', 'dev@example.com')
      const designer = await User.findBy('email', 'designer@example.com')
      const manager = await User.findBy('email', 'gerente@example.com')

      if (!developer || !designer || !manager) {
        logger.warn('CommentSeeder: Um ou mais usuários chave (dev, designer, gerente) não foram encontrados. Alguns comentários podem não ser criados.')
      }

      // Buscar tarefas pelos títulos
      const configTask = await Task.findBy('title', 'Configurar ambiente de desenvolvimento')
      const apiTask = await Task.findBy('title', 'Desenvolver API RESTful')
      const wireframesTask = await Task.findBy('title', 'Criar wireframes')
      const designTask = await Task.findBy('title', 'Design de interface')

      if (!configTask || !apiTask || !wireframesTask || !designTask) {
        logger.warn('CommentSeeder: Uma ou mais tarefas chave não foram encontradas. Alguns comentários podem não ser criados.')
      }

      // Função auxiliar para criar comentário/resposta de forma idempotente
      const createCommentIfNotExists = async (
        data: { content: string; task_id: number; userId: number; parentId?: number | null }
      ) => {
        let query = Comment.query()
          .where('content', data.content)
          .where('task_id', data.task_id)
          .where('userId', data.userId)

        if (data.parentId !== undefined && data.parentId !== null) {
          query = query.where('parentId', data.parentId)
        } else {
          // Se parentId é undefined ou explicitamente null, buscamos por parentId IS NULL
          query = query.whereNull('parentId')
        }
        
        const existingComment = await query.first()

        if (!existingComment) {
          // Ao criar, se parentId for undefined, não o passamos, deixando o default do modelo/DB (geralmente null)
          // Se for null, passamos null.
          const createData: any = { ...data }
          if (data.parentId === undefined) {
            delete createData.parentId
          }

          const newComment = await Comment.create(createData)
          logger.info(`CommentSeeder: Comentário/Resposta ID ${newComment.id} ("${data.content.substring(0,30)}...") criado.`)
          return newComment
        } else {
          logger.info(`CommentSeeder: Comentário/Resposta ("${data.content.substring(0,30)}...") já existe (ID: ${existingComment.id}).`)
          return existingComment
        }
      }

      let configTaskComment2: Comment | null = null;
      let apiTaskComment2: Comment | null = null;
      let apiTaskComment2ReplyByManager: Comment | null = null;

      // Comentários para a Tarefa 1 (Configurar ambiente)
      if (configTask && developer) {
        await createCommentIfNotExists({
          content: 'Ambiente configurado com sucesso!',
          task_id: configTask.id,
          userId: developer.id,
        })
      }
      if (configTask && manager) {
        configTaskComment2 = await createCommentIfNotExists({
          content: 'Tudo funcionando conforme esperado.',
          task_id: configTask.id,
          userId: manager.id,
        })
      }
      if (configTaskComment2 && developer && configTask) {
        await createCommentIfNotExists({
          content: 'Ótimo! Podemos prosseguir com a próxima fase então.',
          task_id: configTask.id,
          userId: developer.id,
          parentId: configTaskComment2.id,
        })
      }

      // Comentários para a Tarefa 2 (API RESTful)
      if (apiTask && developer) {
        await createCommentIfNotExists({
          content: 'Iniciando o desenvolvimento da API.',
          task_id: apiTask.id,
          userId: developer.id,
        })
        apiTaskComment2 = await createCommentIfNotExists({
          content: 'Endpoints de usuários já estão funcionando.',
          task_id: apiTask.id,
          userId: developer.id,
        })
      }
      if (apiTaskComment2 && manager && apiTask) {
        apiTaskComment2ReplyByManager = await createCommentIfNotExists({
          content: 'Excelente! Quais foram os principais desafios?',
          task_id: apiTask.id,
          userId: manager.id,
          parentId: apiTaskComment2.id,
        })
      }
      if (apiTaskComment2ReplyByManager && developer && apiTask && apiTaskComment2) { // Garante que o comentário pai (apiTaskComment2) existe
        await createCommentIfNotExists({
          content: 'Principalmente a integração com o sistema legado de autenticação.',
          task_id: apiTask.id,
          userId: developer.id,
          parentId: apiTaskComment2.id, // Resposta ao comentário original "Endpoints de usuários já estão funcionando."
        })
      }
      
      // Coment��rios para a Tarefa 4 (Wireframes) - (Tarefa 3 não tinha comentários no original)
      if (wireframesTask && designer) {
        await createCommentIfNotExists({
          content: 'Wireframes aprovados pelo cliente.',
          task_id: wireframesTask.id,
          userId: designer.id,
        })
      }

      // Comentários para a Tarefa 5 (Design de interface)
      if (designTask && designer) {
        await createCommentIfNotExists({
          content: 'Iniciando o design das páginas principais.',
          task_id: designTask.id,
          userId: designer.id,
        })
      }
      if (designTask && manager) {
        await createCommentIfNotExists({
          content: 'Por favor, use a paleta de cores aprovada.',
          task_id: designTask.id,
          userId: manager.id,
        })
      }

      logger.info('CommentSeeder: Criação/verificação de comentários finalizada.')
    } catch (error) {
      logger.error({ err: error }, 'CommentSeeder: Erro GERAL ao executar seeder de comentários.')
    }
  }
}
