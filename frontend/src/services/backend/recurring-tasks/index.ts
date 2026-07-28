import { useOptimizedQuery, useOptimisticMutation, useCacheManager } from '@/hooks/useOptimizedQuery'
import { queryKeys } from '@/lib/react-query/keys'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import {
  RecurringTask,
  CreateRecurringTaskRequest,
  UpdateRecurringTaskRequest,
} from '@/utils/commonTypes'
import { toast } from '@/components/ui/use-toast'
import { queryClient } from '@/lib/react-query/config'

const recurringTaskService = {
  async getRecurringTasks(): Promise<RecurringTask[]> {
    const response = await api.get(ROUTES.recurringTasks)
    return response.data
  },

  async getRecurringTask(id: number): Promise<RecurringTask> {
    const response = await api.get(`${ROUTES.recurringTasks}/${id}`)
    return response.data
  },

  async createRecurringTask(
    data: CreateRecurringTaskRequest,
  ): Promise<RecurringTask> {
    const response = await api.post(ROUTES.recurringTasks, data)
    return response.data
  },

  async updateRecurringTask(
    id: number,
    data: UpdateRecurringTaskRequest,
  ): Promise<RecurringTask> {
    const response = await api.put(`${ROUTES.recurringTasks}/${id}`, data)
    return response.data
  },

  async deleteRecurringTask(id: number): Promise<void> {
    await api.delete(`${ROUTES.recurringTasks}/${id}`)
  },
}

export const useGetRecurringTasks = () =>
  useOptimizedQuery(
    queryKeys.recurringTasks.lists(),
    recurringTaskService.getRecurringTasks,
    {
      refetchOnMount: true,
      onError: (error) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as tarefas recorrentes',
          variant: 'destructive',
        })
      },
    }
  )

export const useGetRecurringTask = (id: number, enabled = true) =>
  useOptimizedQuery(
    queryKeys.recurringTasks.detail(id),
    () => recurringTaskService.getRecurringTask(id),
    {
      enabled,
      onError: (error) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os detalhes da tarefa recorrente',
          variant: 'destructive',
        })
      },
    }
  )

export const useCreateRecurringTask = () => {
  const { setData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: (data: CreateRecurringTaskRequest) =>
      recurringTaskService.createRecurringTask(data),

    onMutate: async (newRecurringTask) => {
      // Cancelar queries relacionadas
      await queryClient.cancelQueries({ queryKey: queryKeys.recurringTasks.lists() })

      // Salvar snapshot
      const previousRecurringTasks = queryClient.getQueryData(queryKeys.recurringTasks.lists())

      // Adicionar tarefa recorrente otimisticamente
      const optimisticRecurringTask = {
        ...newRecurringTask,
        id: Date.now(), // ID temporário
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setData(queryKeys.recurringTasks.lists(), (old: any) => {
        const tasksArray = Array.isArray(old) ? old : (old?.data || [])
        return [...tasksArray, optimisticRecurringTask]
      })

      return { previousRecurringTasks }
    },

    invalidateKeys: [
      queryKeys.recurringTasks.lists(),
      queryKeys.tasks.lists(),
    ],

    updateCache: (createdRecurringTask) => {
      setData(queryKeys.recurringTasks.detail(createdRecurringTask.id), createdRecurringTask)
    },

    onSuccess: (createdRecurringTask) => {
      toast({
        title: 'Sucesso',
        description: 'Tarefa recorrente criada com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a tarefa recorrente',
        variant: 'destructive',
      })
    },
  })
}

export const useUpdateRecurringTask = () => {
  const { setData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: UpdateRecurringTaskRequest
    }) => recurringTaskService.updateRecurringTask(id, data),

    onMutate: async ({ id, data }) => {
      // Cancelar queries
      await queryClient.cancelQueries({ queryKey: queryKeys.recurringTasks.detail(id) })
      await queryClient.cancelQueries({ queryKey: queryKeys.recurringTasks.lists() })

      // Snapshots
      const previousRecurringTask = queryClient.getQueryData(queryKeys.recurringTasks.detail(id))
      const previousRecurringTasks = queryClient.getQueryData(queryKeys.recurringTasks.lists())

      // Atualização otimista
      setData(queryKeys.recurringTasks.detail(id), (old: any) => ({
        ...old,
        ...data,
        updatedAt: new Date().toISOString(),
      }))

      setData(queryKeys.recurringTasks.lists(), (old: any) => {
        // Lidar com formato de resposta da API (pode ter .data ou ser array direto)
        const tasksArray = Array.isArray(old) ? old : (old?.data || [])
        return tasksArray.map((recurringTask: any) =>
          recurringTask.id === id ? { ...recurringTask, ...data, updatedAt: new Date().toISOString() } : recurringTask
        )
      })

      return { previousRecurringTask, previousRecurringTasks }
    },

    invalidateKeys: [
      queryKeys.recurringTasks.lists(),
      queryKeys.tasks.lists(),
    ],

    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Tarefa recorrente atualizada com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a tarefa recorrente',
        variant: 'destructive',
      })
    },
  })
}

export const useDeleteRecurringTask = () => {
  const { setData, removeData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: (id: number) => recurringTaskService.deleteRecurringTask(id),

    onMutate: async (id) => {
      const recurringTask = queryClient.getQueryData(queryKeys.recurringTasks.detail(id))

      // Remover otimisticamente
      setData(queryKeys.recurringTasks.lists(), (old: any) => {
        const tasksArray = Array.isArray(old) ? old : (old?.data || [])
        return tasksArray.filter((rt: any) => rt.id !== id)
      })

      // Remover do cache individual
      removeData(queryKeys.recurringTasks.detail(id))

      return { deletedRecurringTask: recurringTask }
    },

    invalidateKeys: [
      queryKeys.recurringTasks.lists(),
      queryKeys.tasks.lists(),
    ],

    onSuccess: (_, id) => {
      toast({
        title: 'Sucesso',
        description: 'Tarefa recorrente excluída com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a tarefa recorrente',
        variant: 'destructive',
      })
    },
  })
}