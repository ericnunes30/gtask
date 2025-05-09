import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Project from '#models/project'
import logger from '@adonisjs/core/services/logger'

export default class ProjectsUsersSeeder extends BaseSeeder {
  async run() {
    logger.info('ProjectsUsersSeeder: Iniciando associação de usuários a projetos.')
    try {
      // Buscar usuários
      const userEric = await User.findBy('email', 'equipesurreal@surrealgroup.com.br')
      const userManager = await User.findBy('email', 'gerente@example.com')
      const userDeveloper = await User.findBy('email', 'dev@example.com')
      const userDesigner = await User.findBy('email', 'designer@example.com')

      // Buscar projetos pelos títulos
      const projectTaskManagement = await Project.findBy('title', 'Sistema de Gerenciamento de Tarefas')
      const projectWebsiteRedesign = await Project.findBy('title', 'Redesign do Site Institucional')
      const projectMobileApp = await Project.findBy('title', 'Aplicativo Mobile')

      // Função auxiliar para associar usuário a projeto se não existir
      const associateUserToProject = async (project: Project | null, user: User | null, projectName: string, userEmail: string) => {
        if (project && user) {
          const existingRelation = await project.related('users').query().where('user_id', user.id).first()
          if (!existingRelation) {
            await project.related('users').attach([user.id])
            logger.info(`ProjectsUsersSeeder: Usuário "${userEmail}" associado ao projeto "${projectName}".`)
          } else {
            logger.info(`ProjectsUsersSeeder: Usuário "${userEmail}" já está associado ao projeto "${projectName}".`)
          }
        } else {
          if (!project) logger.warn(`ProjectsUsersSeeder: Projeto "${projectName}" não encontrado para associação.`)
          if (!user) logger.warn(`ProjectsUsersSeeder: Usuário "${userEmail}" não encontrado para associação.`)
        }
      }

      // Associar usuários ao projeto Sistema de Gerenciamento de Tarefas
      if (projectTaskManagement) {
        await associateUserToProject(projectTaskManagement, userEric, projectTaskManagement.title, 'equipesurreal@surrealgroup.com.br')
        await associateUserToProject(projectTaskManagement, userManager, projectTaskManagement.title, 'gerente@example.com')
        await associateUserToProject(projectTaskManagement, userDeveloper, projectTaskManagement.title, 'dev@example.com')
      }

      // Associar usuários ao projeto Redesign do Site Institucional
      if (projectWebsiteRedesign) {
        await associateUserToProject(projectWebsiteRedesign, userManager, projectWebsiteRedesign.title, 'gerente@example.com')
        await associateUserToProject(projectWebsiteRedesign, userDesigner, projectWebsiteRedesign.title, 'designer@example.com')
      }

      // Associar usuários ao projeto Aplicativo Mobile
      if (projectMobileApp) {
        await associateUserToProject(projectMobileApp, userEric, projectMobileApp.title, 'equipesurreal@surrealgroup.com.br')
        await associateUserToProject(projectMobileApp, userManager, projectMobileApp.title, 'gerente@example.com')
        await associateUserToProject(projectMobileApp, userDeveloper, projectMobileApp.title, 'dev@example.com')
        await associateUserToProject(projectMobileApp, userDesigner, projectMobileApp.title, 'designer@example.com')
      }

      logger.info('ProjectsUsersSeeder: Associações de usuários a projetos verificadas/criadas.')
    } catch (error) {
      logger.error({ err: error }, 'ProjectsUsersSeeder: Erro ao associar usuários a projetos.')
    }
  }
}
