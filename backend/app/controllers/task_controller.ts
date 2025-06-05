import type { HttpContext } from '@adonisjs/core/http'

import { createTaskValidator } from '#validators/task'
import vine from '@vinejs/vine'
import Task from '#models/task'
import ActivityLog from '#models/activity_log' // Importar ActivityLog

export default class TasksController {
    async index({}: HttpContext) {
        // Retorna todas as tarefas com seus relacionamentos
        const tasks = await Task.query()
            .preload('project')
            .preload('users')
            .preload('occupations')
            .orderBy('status')
            .orderBy('order')

        // Incluir o campo timer em cada tarefa
        const tasksWithTimer = tasks.map(task => {
            const taskData = task.toJSON()
            taskData.timer = task.timer || 0
            return taskData
        })

        return tasksWithTimer
    }

    async store({ request, auth }: HttpContext) {
        const data = await request.validateUsing(createTaskValidator)

        // Verificar se os campos startDate e dueDate foram enviados
        if (data.startDate !== undefined) {
            data.start_date = data.startDate
            delete data.startDate
        }
        if (data.dueDate !== undefined) {
            data.due_date = data.dueDate
            delete data.dueDate
        }
        if (data.projectId !== undefined) {
            data.project_id = data.projectId
            delete data.projectId
        }

        // Definir ordem padrão caso não seja fornecida
        if (data.order === undefined || data.order === null) {
            const maxOrderRow = await Task.query().max('order as max').first()
            const nextOrder = (Number(maxOrderRow?.$extras.max) || 0) + 10
            data.order = nextOrder
        }

        const {
            title,
            description,
            priority,
            status,
            start_date,
            due_date,
            project_id,
            order,
            timer,
            users,
            occupations
        } = data

        const task = await Task.create({
            title,
            description,
            priority,
            status,
            start_date,
            due_date,
            project_id,
            order,
            timer: timer || 0 // Usa o valor fornecido ou 0 como padrão
        } as any)

        if (users && users.length > 0) {
            await task.related('users').attach(users)
        } else {
            // Attach current user if no users specified
            await task.related('users').attach([auth.user!.id])
        }

        if (occupations && occupations.length > 0) {
            await task.related('occupations').attach(occupations)
        }

        // Refresh the task instance to ensure date fields are DateTime objects
        await task.refresh()

        // Logging task creation and initial assignee setup
        const actingUserId = auth.user!.id
        const createdTaskId = task.id

        // Log: Task Created
        // Ensure all fields for details are actually present on the task object or handle potential null/undefined
        await ActivityLog.create({
          userId: actingUserId,
          taskId: createdTaskId,
          actionType: 'TASK_CREATED',
          details: {
            title: task.title,
            description: task.description ?? null, // Handle potential null
            priority: task.priority,
            status: task.status,
            project_id: task.project_id,
            start_date: task.start_date ? task.start_date.toISODate() : null,
            due_date: task.due_date ? task.due_date.toISODate() : null,
          },
        })

        // Determine final list of assigned user IDs for logging
        // We need to fetch the actual users attached to the task to be certain
        await task.load('users')
        const finalAssignedUserIds = task.users.map(u => u.id)

        // Log: Task Assignees Set
        if (finalAssignedUserIds.length > 0) {
          await ActivityLog.create({
            userId: actingUserId,
            taskId: createdTaskId,
            actionType: 'TASK_ASSIGNEES_SET',
            changedField: 'users',
            newValue: JSON.stringify(finalAssignedUserIds.sort()), // Sort for consistent logging
          })
        }

        return task
    }

    async show({ params, response }: HttpContext) {
        try {
            console.log(`TasksController.show - Attempting to find task with params.id: ${params.id} (Type: ${typeof params.id})`)
            const task = await Task.findByOrFail('id', params.id)
            await task.load('project')
            await task.load('users')
            await task.load('occupations')

            // Carregar comentários de nível superior
            await task.load('comments', (commentsQuery) => {
              commentsQuery
                .whereNull('parent_id') // Apenas comentários de nível superior
                .preload('user') // Usuário do comentário principal
                .preload('mentionedUsers') // Menções no comentário principal
                .preload('replies', (repliesQuery) => { // Pré-carrega as respostas diretas
                  repliesQuery
                    .preload('user') // Usuário da resposta
                    .preload('mentionedUsers') // Menções na resposta
                    // Não precisamos de .withCount('replies') para as respostas, pois é apenas 1 nível de aninhamento
                    .orderBy('created_at', 'asc'); // Ordena as respostas
                })
                // .withCount('replies', (queryBuilder) => queryBuilder.as('repliesCount')) // Conta as respostas diretas do comentário principal
                .orderBy('created_at', 'desc'); // Ordena os comentários principais
            })

            // Incluir o campo timer na resposta
            const taskData = task.toJSON()
            taskData.timer = task.timer || 0
            // Os comentários carregados (com repliesCount) já estarão em taskData.comments

            return taskData
        } catch (error) {
            console.error(`TasksController.show - Error finding task with params.id: ${params.id}:`, error)
            return response.status(400).json({error: "Task not found!"})
        }
    }

    async update({ request, params, response, auth }: HttpContext) {
        try {
            const { order } = await request.validateUsing(
                vine.compile(vine.object({ order: vine.number() }))
            )

            const task = await Task.findByOrFail('id', params.id)
            const oldOrder = task.order

            task.order = order
            await task.save()

            if (oldOrder !== order) {
                await ActivityLog.create({
                    userId: auth.user!.id,
                    taskId: task.id,
                    actionType: 'TASK_ORDER_UPDATED',
                    changedField: 'order',
                    oldValue: oldOrder !== null ? String(oldOrder) : null,
                    newValue: String(order),
                })
            }

            await task.refresh()
            await task.load('project')
            await task.load('users')
            await task.load('occupations')

            const responseData = task.toJSON()
            responseData.timer = task.timer || 0
            return responseData
        } catch (error) {
            console.error('Erro ao atualizar tarefa:', error)
            return response.status(400).json({ error: 'Task not found!' })
        }
    }

    async destroy({ params, response }: HttpContext) {
        try {
            const task = await Task.findByOrFail('id', params.id)
            await task.delete()
            return response.status(203)
        } catch (error) {
            return response.status(400).json({error: "Task not found!"})
        }
    }

    // Novo método para buscar o hist��rico de uma tarefa
    async getHistory({ params, request, response }: HttpContext) {
        try {
            const taskId = params.taskId

            // 1. Valida se a tarefa existe
            await Task.findOrFail(taskId)

            // 2. Busca os logs de atividade para esta tarefa, paginados
            const page = request.input('page', 1)
            const limit = request.input('limit', 20) // Limite padrão maior para histórico?

            const activityLogs = await ActivityLog.query()
                .where('task_id', taskId)
                .preload('user') // Carrega o usuário que realizou a ação (se houver)
                .orderBy('created_at', 'desc') // Histórico geralmente do mais recente para o mais antigo
                .paginate(page, limit)

            return activityLogs

        } catch (error) {
            if (error.code === 'E_ROW_NOT_FOUND') {
                // Se a tarefa não foi encontrada
                return response.status(404).json({ error: 'Task not found' })
            }
            // Usar um helper genérico para outros erros (poderia ser definido aqui ou importado)
            console.error('Erro ao buscar histórico da tarefa:', error)
            return response.status(500).json({ error: 'An unexpected error occurred on the server.' })
        }
    }
}
