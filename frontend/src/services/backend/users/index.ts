import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import userService, {
  CreateUserRequest,
  UpdateUserRequest,
} from '@/lib/api/users'

export const useGetUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: userService.getUsers })

interface MutateUserArgs {
  id?: number
  data: CreateUserRequest | UpdateUserRequest
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: MutateUserArgs) =>
      id
        ? userService.updateUser(id, data as UpdateUserRequest)
        : userService.createUser(data as CreateUserRequest),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => userService.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}
