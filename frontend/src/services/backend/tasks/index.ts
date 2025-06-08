import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import taskService, {
  CreateTaskRequest,
  UpdateTaskRequest,
} from '@/lib/api/tasks'

export const useGetTasks = () =>
  useQuery({ queryKey: ['tasks'], queryFn: taskService.getTasks })

interface MutateTaskArgs {
  id?: number
  data: CreateTaskRequest | UpdateTaskRequest
}

export const useCreateTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: MutateTaskArgs) =>
      id
        ? taskService.updateTask(id, data as UpdateTaskRequest)
        : taskService.createTask(data as CreateTaskRequest),
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
