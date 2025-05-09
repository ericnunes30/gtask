import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Occupation from '#models/occupation'
import Task from '#models/task'
import logger from '@adonisjs/core/services/logger'

export default class OccupationsTasksSeeder extends BaseSeeder {
  async run() {
    logger.info('OccupationsTasksSeeder: Iniciando associação de ocupações a tarefas.')
    try {
      // Buscar ocupações
      const backendDev = await Occupation.findBy('name', 'Desenvolvedor Backend')
      const designer = await Occupation.findBy('name', 'Designer UI/UX')

      // Buscar tarefas pelos títulos
      const configTask = await Task.findBy('title', 'Configurar ambiente de desenvolvimento')
      const apiTask = await Task.findBy('title', 'Desenvolver API RESTful')
      const authTask = await Task.findBy('title', 'Implementar autenticação')
      const wireframesTask = await Task.findBy('title', 'Criar wireframes')
      const designTask = await Task.findBy('title', 'Design de interface')

      // Função auxiliar para associar ocupação a tarefa
      const associateOccupationToTask = async (task: Task | null, occupation: Occupation | null, taskTitle: string, occupationName: string) => {
        if (task && occupation) {
          // Usar occupation.related('tasks') para consistência com o original
          const existingRelation = await occupation.related('tasks').query().where('task_id', task.id).first()
          if (!existingRelation) {
            await occupation.related('tasks').attach([task.id])
            logger.info(`OccupationsTasksSeeder: Ocupação "${occupationName}" associada à tarefa "${taskTitle}".`)
          } else {
            logger.info(`OccupationsTasksSeeder: Ocupação "${occupationName}" já associada à tarefa "${taskTitle}".`)
          }
        } else {
          if (!task) logger.warn(`OccupationsTasksSeeder: Tarefa "${taskTitle}" não encontrada.`)
          if (!occupation) logger.warn(`OccupationsTasksSeeder: Ocupação "${occupationName}" não encontrada.`)
        }
      }
      
      if (backendDev) {
        await associateOccupationToTask(configTask, backendDev, 'Configurar ambiente de desenvolvimento', 'Desenvolvedor Backend')
        await associateOccupationToTask(apiTask, backendDev, 'Desenvolver API RESTful', 'Desenvolvedor Backend')
        await associateOccupationToTask(authTask, backendDev, 'Implementar autenticação', 'Desenvolvedor Backend')
      } else {
        logger.warn('OccupationsTasksSeeder: Ocupação "Desenvolvedor Backend" não encontrada.')
      }

      if (designer) {
        await associateOccupationToTask(wireframesTask, designer, 'Criar wireframes', 'Designer UI/UX')
        await associateOccupationToTask(designTask, designer, 'Design de interface', 'Designer UI/UX')
      } else {
        logger.warn('OccupationsTasksSeeder: Ocupação "Designer UI/UX" não encontrada.')
      }

      logger.info('OccupationsTasksSeeder: Associações de ocupações a tarefas verificadas/criadas.')
    } catch (error) {
      logger.error({ err: error }, 'OccupationsTasksSeeder: Erro ao associar ocupaç��es a tarefas.')
    }
  }
}
