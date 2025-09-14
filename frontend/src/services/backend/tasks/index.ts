import { useOptimizedQuery, useOptimisticMutation, useCacheManager, useDependentQuery, useQueryClient, usePrefetch } from '@/hooks/useOptimizedQuery'
import { queryKeys } from '@/lib/react-query/keys'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import { Task, CreateTaskRequest, UpdateTaskRequest } from '@/common/types'
import { transformApiTaskToFrontend } from '@/utils/apiTransformers'
import { toast } from '@/components/ui/use-toast'

const taskService = {
  async getTasks(): Promise<Task[]> {
    const response = await api.get(ROUTES.tasks)
    return response.data.data.map(transformApiTaskToFrontend)
  },

  async getTask(id: number): Promise<Task> {
    const response = await api.get(`${ROUTES.tasks}/${id}`)
    return transformApiTaskToFrontend(response.data.data)
  },

  async getTasksByProject(projectId: number): Promise<Task[]> {
    // backend expects query param "project"
    const response = await api.get(`${ROUTES.tasks}?project=${projectId}`)
    return response.data.data.map(transformApiTaskToFrontend)
  },

  async createTask(data: CreateTaskRequest): Promise<Task> {
    const response = await api.post(ROUTES.tasks, data)
    return transformApiTaskToFrontend(response.data.data)
  },

  async updateTask({ id, data }: { id: number; data: UpdateTaskRequest }): Promise<Task> {
    const response = await api.patch(`${ROUTES.tasks}/${id}`, data)
    return transformApiTaskToFrontend(response.data.data)
  },

  async deleteTask(id: number): Promise<void> {
    await api.delete(`${ROUTES.tasks}/${id}`)
  },
}

export const useGetTasks = () =>
  useOptimizedQuery(
    queryKeys.tasks.lists(),
    taskService.getTasks,
    {
      onError: (error) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as tarefas',
          variant: 'destructive',
        })
      },
    }
  )

export const useGetTask = (taskId: number) =>
  useOptimizedQuery(
    queryKeys.tasks.detail(taskId),
    () => taskService.getTask(taskId),
    {
      staleTime: 1000 * 60, // 1 minuto - dados de tarefa específica
      onError: (error) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os detalhes da tarefa',
          variant: 'destructive',
        })
      },
    }
  )

export const useGetTasksByProject = (projectId: number | undefined) =>
  useDependentQuery(
    queryKeys.tasks.byProject(projectId || 0),
    () => taskService.getTasksByProject(projectId!),
    [projectId],
    {
      enabled: !!projectId,
    }
  )

export const useCreateTask = () => {
  const { setData } = useCacheManager()

  return useOptimisticMutation(
    {
      mutationFn: (data: CreateTaskRequest) => taskService.createTask(data),

      onMutate: async (newTask) => {
        // Cancelar queries relacionadas
        await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() })
        if (newTask.projectId) {
          await queryClient.cancelQueries({
            queryKey: queryKeys.tasks.byProject(newTask.projectId)
          })
        }

        // Salvar snapshots
        const previousTasks = queryClient.getQueryData(queryKeys.tasks.lists())
        const previousProjectTasks = newTask.projectId
          ? queryClient.getQueryData(queryKeys.tasks.byProject(newTask.projectId))
          : undefined

        // Adicionar tarefa otimisticamente
        const optimisticTask = {
          ...newTask,
          id: Date.now(), // ID temporário
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        setData(queryKeys.tasks.lists(), (old: any) => [...(old || []), optimisticTask])

        if (newTask.projectId) {
          setData(
            queryKeys.tasks.byProject(newTask.projectId),
            (old: any) => [...(old || []), optimisticTask]
          )
        }

        return { previousTasks, previousProjectTasks, newTask }
      },

      invalidateKeys: (data, variables, context) => [
        queryKeys.tasks.lists(),
        queryKeys.projects.lists(),
        ...(context?.newTask?.projectId ? [queryKeys.tasks.byProject(context.newTask.projectId)] : []),
      ],

      updateCache: (createdTask) => {
        setData(queryKeys.tasks.detail(createdTask.id), createdTask)
        if (createdTask.projectId) {
          // Invalidar estatísticas do projeto
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.statistics(createdTask.projectId)
          })
        }
      },

      onSuccess: (createdTask) => {
        toast({
          title: 'Sucesso',
          description: 'Tarefa criada com sucesso',
        })
      },

      onError: (error, variables, context) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível criar a tarefa',
          variant: 'destructive',
        })
      },
    }
  )
}

export const useUpdateTask = () => {
  const { setData } = useCacheManager()

  return useOptimisticMutation(
    {
      mutationFn: (payload: { id: number; data: UpdateTaskRequest }) =>
        taskService.updateTask(payload),

      onMutate: async ({ id, data }) => {
        // Cancelar queries
        await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(id) })
        await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() })

        // Snapshots
        const previousTask = queryClient.getQueryData(queryKeys.tasks.detail(id))
        const previousTasks = queryClient.getQueryData(queryKeys.tasks.lists())

        // Atualização otimista
        setData(queryKeys.tasks.detail(id), (old: any) => ({
          ...old,
          ...data,
          updatedAt: new Date().toISOString(),
        }))

        setData(queryKeys.tasks.lists(), (old: any[]) =>
          old?.map(task =>
            task.id === id ? { ...task, ...data, updatedAt: new Date().toISOString() } : task
          ) || []
        )

        return { previousTask, previousTasks }
      },

      invalidateKeys: [
        queryKeys.tasks.lists(),
        queryKeys.projects.lists(),
      ],

      updateCache: (updatedTask) => {
        // Atualizar queries relacionadas
        if (updatedTask.projectId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.tasks.byProject(updatedTask.projectId)
          })
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.statistics(updatedTask.projectId)
          })
        }
      },

      onSuccess: () => {
        toast({
          title: 'Sucesso',
          description: 'Tarefa atualizada com sucesso',
        })
      },
    }
  )
}

export const useDeleteTask = () => {
  const { setData, removeData } = useCacheManager()

  return useOptimisticMutation(
    {
      mutationFn: (id: number) => taskService.deleteTask(id),

      onMutate: async (id) => {
        const task = queryClient.getQueryData(queryKeys.tasks.detail(id))

        // Remover otimisticamente
        setData(queryKeys.tasks.lists(), (old: any[]) =>
          old?.filter(t => t.id !== id) || []
        )

        if (task?.projectId) {
          setData(
            queryKeys.tasks.byProject(task.projectId),
            (old: any[]) => old?.filter(t => t.id !== id) || []
          )
        }

        // Remover do cache individual
        removeData(queryKeys.tasks.detail(id))

        return { deletedTask: task }
      },

      invalidateKeys: [
        queryKeys.tasks.lists(),
        queryKeys.projects.lists(),
      ],

      onSuccess: (_, id) => {
        toast({
          title: 'Sucesso',
          description: 'Tarefa excluída com sucesso',
        })
      },
    }
  )
}

// Novo hook para prefetch de tarefas
export const useTaskPrefetch = () => {
  const { prefetch } = usePrefetch()

  const prefetchTask = (taskId: number) => {
    prefetch(
      queryKeys.tasks.detail(taskId),
      () => taskService.getTask(taskId),
      { staleTime: 1000 * 60 * 2 } // 2 minutos
    )
  }

  return { prefetchTask }
}
