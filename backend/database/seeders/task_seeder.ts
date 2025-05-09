import Task from '#models/task'
import Project from '#models/project'
import { PriorityLevel, Status } from '#models/task' // Supondo que estão no mesmo arquivo ou importados
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'

export default class TaskSeeder extends BaseSeeder {
  async run() {
    logger.info('TaskSeeder: Iniciando criação/verificação de tarefas.')
    try {
      // TRUNCATE removido

      // Buscar projetos pelos títulos para obter seus IDs
      // Idealmente, os projetos já foram criados pelo ProjectSeeder
      const project1 = await Project.findBy('title', 'Sistema de Gerenciamento de Tarefas')
      const project2 = await Project.findBy('title', 'Redesign do Site Institucional')

      if (!project1) {
        logger.error('TaskSeeder: Projeto "Sistema de Gerenciamento de Tarefas" não encontrado. Abortando tasks para este projeto.')
        return // Ou tratar erro de forma diferente
      }
      if (!project2) {
        logger.error('TaskSeeder: Projeto "Redesign do Site Institucional" não encontrado. Abortando tasks para este projeto.')
        return // Ou tratar erro de forma diferente
      }

      const tasksData = [
        // Projeto 1: Sistema de Gerenciamento de Tarefas
        {
          title: 'Configurar ambiente de desenvolvimento',
          description: 'Configurar servidores, banco de dados e ambiente de desenvolvimento',
          priority: PriorityLevel.High,
          status: Status.Done,
          start_date: DateTime.now().minus({ days: 30 }),
          due_date: DateTime.now().minus({ days: 25 }),
          project_id: project1.id,
          order: 1,
        },
        {
          title: 'Desenvolver API RESTful',
          description: 'Criar endpoints da API para o sistema de gerenciamento',
          priority: PriorityLevel.High,
          status: Status.InProgress,
          start_date: DateTime.now().minus({ days: 20 }),
          due_date: DateTime.now().plus({ days: 10 }),
          project_id: project1.id,
          order: 2,
        },
        {
          title: 'Implementar autenticação',
          description: 'Implementar sistema de autenticação e autorização',
          priority: PriorityLevel.Medium,
          status: Status.ToDo,
          start_date: DateTime.now().plus({ days: 5 }),
          due_date: DateTime.now().plus({ days: 15 }),
          project_id: project1.id,
          order: 3,
        },
        // Projeto 2: Redesign do Site Institucional
        {
          title: 'Criar wireframes',
          description: 'Desenvolver wireframes para as principais páginas do site',
          priority: PriorityLevel.Medium,
          status: Status.Done,
          start_date: DateTime.now().minus({ days: 15 }),
          due_date: DateTime.now().minus({ days: 10 }),
          project_id: project2.id,
          order: 1,
        },
        {
          title: 'Design de interface',
          description: 'Criar design visual para o site baseado nos wireframes',
          priority: PriorityLevel.Medium,
          status: Status.InProgress,
          start_date: DateTime.now().minus({ days: 8 }),
          due_date: DateTime.now().plus({ days: 5 }),
          project_id: project2.id,
          order: 2,
        },
      ]

      for (const taskData of tasksData) {
        await Task.firstOrCreate(
          { title: taskData.title, project_id: taskData.project_id },
          taskData
        )
        logger.info(`TaskSeeder: Tarefa "${taskData.title}" para projeto ID ${taskData.project_id} verificada/criada.`)
      }

      logger.info('TaskSeeder: Tarefas verificadas/criadas com sucesso.')
    } catch (error) {
      logger.error({ err: error }, 'TaskSeeder: Erro ao verificar/criar tarefas.')
    }
  }
}
