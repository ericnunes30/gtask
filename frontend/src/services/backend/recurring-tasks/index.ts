import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import {
  RecurringTask,
  CreateRecurringTaskRequest,
  UpdateRecurringTaskRequest,
} from '@/common/types'

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
  useQuery({
    queryKey: ['recurringTasks'],
    queryFn: recurringTaskService.getRecurringTasks,
  })

export const useGetRecurringTask = (id: number, enabled = true) =>
  useQuery({
    queryKey: ['recurringTask', id],
    queryFn: () => recurringTaskService.getRecurringTask(id),
    enabled,
  })

export const useCreateRecurringTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRecurringTaskRequest) =>
      recurringTaskService.createRecurringTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringTasks'] })
    },
  })
}

export const useUpdateRecurringTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: UpdateRecurringTaskRequest
    }) => recurringTaskService.updateRecurringTask(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recurringTasks'] })
      queryClient.invalidateQueries({ queryKey: ['recurringTask', data.id] })
    },
  })
}

export const useDeleteRecurringTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => recurringTaskService.deleteRecurringTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringTasks'] })
    },
  })
}