import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import taskService, {
  CreateTaskRequest,
  UpdateTaskRequest,
} from '@/lib/api/tasks'

export const useGetTasks = () =>
  useQuery({ queryKey: ['tasks'], queryFn: taskService.getTasks })

export const useCreateTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskRequest) => taskService.createTask(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export const useUpdateTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskRequest }) =>
      taskService.updateTask(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export const useDeleteTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => taskService.deleteTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
