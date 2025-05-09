import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Occupation from '#models/occupation'
import Project from '#models/project'
import logger from '@adonisjs/core/services/logger'

export default class OccupationsProjectsSeeder extends BaseSeeder {
  async run() {
    logger.info('OccupationsProjectsSeeder: Iniciando associação de ocupações a projetos.')
    try {
      // Buscar ocupações
      const frontendDev = await Occupation.findBy('name', 'Desenvolvedor Frontend')
      const backendDev = await Occupation.findBy('name', 'Desenvolvedor Backend')
      const designer = await Occupation.findBy('name', 'Designer UI/UX')
      const projectManager = await Occupation.findBy('name', 'Gerente de Projetos')

      // Buscar projetos
      const taskManagement = await Project.findBy('title', 'Sistema de Gerenciamento de Tarefas')
      const websiteRedesign = await Project.findBy('title', 'Redesign do Site Institucional')
      const mobileApp = await Project.findBy('title', 'Aplicativo Mobile')

      // Função auxiliar para associar ocupação a projeto
      const associateOccupationToProject = async (project: Project | null, occupation: Occupation | null, projectName: string, occupationName: string) => {
        if (project && occupation) {
          const existingRelation = await project.related('occupations').query().where('occupation_id', occupation.id).first()
          if (!existingRelation) {
            await project.related('occupations').attach([occupation.id])
            logger.info(`OccupationsProjectsSeeder: Ocupação "${occupationName}" associada ao projeto "${projectName}".`)
          } else {
            logger.info(`OccupationsProjectsSeeder: Ocupação "${occupationName}" já associada ao projeto "${projectName}".`)
          }
        } else {
          if (!project) logger.warn(`OccupationsProjectsSeeder: Projeto "${projectName}" não encontrado.`)
          if (!occupation) logger.warn(`OccupationsProjectsSeeder: Ocupação "${occupationName}" não encontrada.`)
        }
      }

      // Associar ocupações a projetos
      if (taskManagement) {
        await associateOccupationToProject(taskManagement, backendDev, 'Sistema de Gerenciamento de Tarefas', 'Desenvolvedor Backend')
        await associateOccupationToProject(taskManagement, projectManager, 'Sistema de Gerenciamento de Tarefas', 'Gerente de Projetos')
      }

      if (websiteRedesign) {
        await associateOccupationToProject(websiteRedesign, frontendDev, 'Redesign do Site Institucional', 'Desenvolvedor Frontend')
        await associateOccupationToProject(websiteRedesign, designer, 'Redesign do Site Institucional', 'Designer UI/UX')
        await associateOccupationToProject(websiteRedesign, projectManager, 'Redesign do Site Institucional', 'Gerente de Projetos')
      }

      if (mobileApp) {
        await associateOccupationToProject(mobileApp, frontendDev, 'Aplicativo Mobile', 'Desenvolvedor Frontend')
        await associateOccupationToProject(mobileApp, backendDev, 'Aplicativo Mobile', 'Desenvolvedor Backend')
        await associateOccupationToProject(mobileApp, designer, 'Aplicativo Mobile', 'Designer UI/UX')
        await associateOccupationToProject(mobileApp, projectManager, 'Aplicativo Mobile', 'Gerente de Projetos')
      }
      logger.info('OccupationsProjectsSeeder: Associações de ocupações a projetos verificadas/criadas.')
    } catch (error) {
      logger.error({ err: error }, 'OccupationsProjectsSeeder: Erro ao associar ocupações a projetos.')
    }
  }
}
