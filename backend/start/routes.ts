import router from '@adonisjs/core/services/router'

import { middleware } from './kernel.js'

import UsersController from '#controllers/user_controller'
import TasksController from '#controllers/task_controller'
import CommentsController from '#controllers/comment_controller'
import OccupationsController from '#controllers/occupation_controller'
import ProjectsController from '#controllers/project_controller'
import RolesController from '#controllers/role_controller'
import SessionController from '#controllers/session_controller'

router.post('session', [SessionController, 'store'])

router.resource('user', UsersController).apiOnly()

// Linha removida, a rota será definida dentro do grupo abaixo
router.group(() => {
    router.resource('task', TasksController).apiOnly()
    router.get('/task/:taskId/history', [TasksController, 'getHistory']).as('tasks.history') // Rota para histórico da tarefa
    // Rotas espec��ficas para comentários devem vir antes do resource genérico
    router.get('/comment/task/:taskId', [CommentsController, 'findByTask'])
    router.get('/comment/:commentId/replies', [CommentsController, 'findReplies']) // Rota para buscar respostas
    router.post('/comment/:commentId/like', [CommentsController, 'addLike']).as('comments.like') // Rota para curtir
    router.delete('/comment/:commentId/like', [CommentsController, 'removeLike']).as('comments.unlike') // Rota para descurtir
    router.resource('comment', CommentsController).apiOnly()
    router.resource('occupation', OccupationsController).apiOnly()
    router.resource('project', ProjectsController).apiOnly()
    router.resource('role', RolesController).apiOnly()
}).use(middleware.auth())
