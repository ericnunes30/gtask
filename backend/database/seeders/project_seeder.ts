import Project from '#models/project'
import { PriorityLevel } from '#models/project' // Supondo que PriorityLevel está no mesmo arquivo ou importado corretamente
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'

export default class ProjectSeeder extends BaseSeeder {
  async run() {
    logger.info('ProjectSeeder: Iniciando criação/verificação de projetos.')
    try {
      const projectsData = [
        {
          title: 'Sistema de Gerenciamento de Tarefas',
          description: 'Desenvolvimento de um sistema para gerenciar tarefas e projetos de equipes',
          status: true,
          priority: PriorityLevel.High,
          start_date: DateTime.now().minus({ days: 30 }),
          end_date: DateTime.now().plus({ days: 60 }),
        },
        {
          title: 'Redesign do Site Institucional',
          description: 'Atualização do design e conteúdo do site institucional da empresa',
          status: true,
          priority: PriorityLevel.Medium,
          start_date: DateTime.now().minus({ days: 15 }),
          end_date: DateTime.now().plus({ days: 45 }),
        },
        {
          title: 'Aplicativo Mobile',
          description: 'Desenvolvimento de um aplicativo mobile para clientes',
          status: false, // Mantido como false conforme original
          priority: PriorityLevel.Urgent,
          start_date: DateTime.now().plus({ days: 15 }),
          end_date: DateTime.now().plus({ days: 90 }),
        },
      ]

      for (const projectData of projectsData) {
        await Project.firstOrCreate({ title: projectData.title }, projectData)
        logger.info(`ProjectSeeder: Projeto "${projectData.title}" verificado/criado.`)
      }

      logger.info('ProjectSeeder: Projetos verificados/criados com sucesso.')
      const projects = await Project.all()
      logger.info(`ProjectSeeder: Total de projetos no banco: ${projects.length}`)
    } catch (error) {
      logger.error({ err: error },'ProjectSeeder: Erro ao verificar/criar projetos.')
    }
  }
}
