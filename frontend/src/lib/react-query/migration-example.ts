// Exemplo de migração do serviço de Tasks para otimizações do React Query

// ===== VERSÃO ANTIGA =====
/*
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import { Task, CreateTaskRequest, UpdateTaskRequest } from '@/utils/commonTypes'
import { transformApiTaskToFrontend } from '@/utils/apiTransformers'

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
  useQuery({ queryKey: ['tasks'], queryFn: taskService.getTasks })

export const useGetTask = (taskId: number) =>
  useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskService.getTask(taskId),
  })

export const useGetTasksByProject = (projectId: number, enabled = true) =>
  useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: () => taskService.getTasksByProject(projectId),
    enabled,
  })

export const useCreateTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskRequest) => taskService.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] })
    },
  })
}

export const useUpdateTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: number; data: UpdateTaskRequest }) =>
      taskService.updateTask(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task'] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] })
    },
  })
}

export const useDeleteTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => taskService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task'] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] })
    },
  })
}
*/

// ===== VERSÃO OTIMIZADA =====
import {
  useOptimizedQuery,
  useOptimisticMutation,
  useCacheManager,
  useDependentQuery
} from '@/hooks/useOptimizedQuery'
import { queryKeys } from '@/lib/react-query/keys'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import { Task, CreateTaskRequest, UpdateTaskRequest } from '@/utils/commonTypes'
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

// Queries otimizadas - usarão estratégia TASK (2 minutos de cache)
export const useGetTasks = () =>
  useOptimizedQuery(
    queryKeys.tasks.lists(),
    taskService.getTasks,
    {
      // Opções adicionais se necessário
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
      // Dados de tarefa específica podem ter cache mais curto
      staleTime: 1000 * 60, // 1 minuto
    }
  )

// Query dependente - só carrega se projectId existir
export const useGetTasksByProject = (projectId: number | undefined) =>
  useDependentQuery(
    queryKeys.tasks.byProject(projectId || 0),
    () => taskService.getTasksByProject(projectId!),
    [projectId],
    {
      enabled: !!projectId,
    }
  )

// Mutation com optimistic updates
export const useCreateTask = () => {
  const { setData } = useCacheManager()

  return useOptimisticMutation(
    {
      mutationFn: (data: CreateTaskRequest) => taskService.createTask(data),

      // Atualização otimista
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

        return { previousTasks, previousProjectTasks }
      },

      // Invalidação precisa após sucesso
      invalidateKeys: [
        queryKeys.tasks.lists(),
        queryKeys.projects.lists(),
        ...(data?.projectId ? [queryKeys.tasks.byProject(data.projectId)] : []),
      ],

      // Atualizar cache com dados reais
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

// Update com optimistic updates e rollback
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

// Delete com optimistic updates
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

// Novos hooks otimizados adicionais

// Hook para prefetch de tarefas
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

// Hook para tarefas com filtro
export const useFilteredTasks = (filters: {
  status?: string
  assigneeId?: number
  projectId?: number
}) => {
  const filterKey = JSON.stringify(filters)

  return useOptimizedQuery(
    [...queryKeys.tasks.lists(), { filters }],
    async () => {
      let url = ROUTES.tasks
      const params = new URLSearchParams()

      if (filters.status) params.append('status', filters.status)
      if (filters.assigneeId) params.append('assigneeId', filters.assigneeId.toString())
      if (filters.projectId) params.append('project', filters.projectId.toString())

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await api.get(url)
      return response.data.data.map(transformApiTaskToFrontend)
    },
    {
      // Cache mais curto para filtros dinâmicos
      staleTime: 1000 * 60, // 1 minuto
    }
  )
}