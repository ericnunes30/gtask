import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Task from '#models/task'
import logger from '@adonisjs/core/services/logger'

export default class TasksUsersSeeder extends BaseSeeder {
  async run() {
    logger.info('TasksUsersSeeder: Iniciando associação de usuários a tarefas.')
    try {
      // Buscar usuários
      const userDeveloper = await User.findBy('email', 'dev@example.com')
      const userDesigner = await User.findBy('email', 'designer@example.com')

      // Buscar tarefas pelos títulos
      const taskConfigEnv = await Task.findBy('title', 'Configurar ambiente de desenvolvimento')
      const taskApiDev = await Task.findBy('title', 'Desenvolver API RESTful')
      const taskAuthImpl = await Task.findBy('title', 'Implementar autenticação')
      const taskWireframes = await Task.findBy('title', 'Criar wireframes')
      const taskUiDesign = await Task.findBy('title', 'Design de interface')
      
      // Função auxiliar para associar usuário a tarefa se não existir
      const associateUserToTask = async (task: Task | null, user: User | null, taskTitle: string, userEmail: string) => {
        if (task && user) {
          // A relação user.tasks() ou task.users() pode ser usada.
          // Vamos usar user.related('tasks') para consistência com o original.
          const existingRelation = await user.related('tasks').query().where('task_id', task.id).first()
          if (!existingRelation) {
            await user.related('tasks').attach([task.id])
            logger.info(`TasksUsersSeeder: Usuário "${userEmail}" associado à tarefa "${taskTitle}".`)
          } else {
            logger.info(`TasksUsersSeeder: Usuário "${userEmail}" já está associado à tarefa "${taskTitle}".`)
          }
        } else {
          if (!task) logger.warn(`TasksUsersSeeder: Tarefa "${taskTitle}" não encontrada para associação.`)
          if (!user) logger.warn(`TasksUsersSeeder: Usuário "${userEmail}" não encontrado para associação.`)
        }
      }

      // Associar tarefas ao desenvolvedor
      if (userDeveloper) {
        await associateUserToTask(taskConfigEnv, userDeveloper, 'Configurar ambiente de desenvolvimento', 'dev@example.com')
        await associateUserToTask(taskApiDev, userDeveloper, 'Desenvolver API RESTful', 'dev@example.com')
        await associateUserToTask(taskAuthImpl, userDeveloper, 'Implementar autenticação', 'dev@example.com')
      } else {
        logger.warn('TasksUsersSeeder: Usuário Desenvolvedor (dev@example.com) não encontrado.')
      }

      // Associar tarefas ao designer
      if (userDesigner) {
        await associateUserToTask(taskWireframes, userDesigner, 'Criar wireframes', 'designer@example.com')
        await associateUserToTask(taskUiDesign, userDesigner, 'Design de interface', 'designer@example.com')
      } else {
        logger.warn('TasksUsersSeeder: Usuário Designer (designer@example.com) não encontrado.')
      }

      logger.info('TasksUsersSeeder: Associações de usuários a tarefas verificadas/criadas.')
    } catch (error) {
      logger.error({ err: error }, 'TasksUsersSeeder: Erro ao associar usuários a tarefas.')
    }
  }
}
