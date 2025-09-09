import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import { CreateUserRequest, UpdateUserRequest, User } from '@/common/types'

export const userService = {
  async getUsers(): Promise<User[]> {
    const response = await api.get(ROUTES.users);
    // Support APIs that return either:
    //  - an array directly in response.data, or
    //  - a paginated wrapper { data: [...] } in response.data.data
    if (response?.data && Array.isArray(response.data)) {
      return response.data as User[];
    }
    if (response?.data && response.data.data && Array.isArray(response.data.data)) {
      return response.data.data as User[];
    }
    // Fallback to whatever the endpoint returned (could be a single object)
    return response.data as any;
  },
  async getUser(userId: number): Promise<User> {
    const response = await api.get(`${ROUTES.users}/${userId}`);
    return response.data;
  },
  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await api.post(ROUTES.users, data);
    return response.data;
  },
  async updateUser(id: number, data: UpdateUserRequest): Promise<User> {
    // backend-2 expects PUT on /users/:id
    const response = await api.put(`${ROUTES.users}/${id}`, data);
    return response.data;
  },
  async deleteUser(id: number): Promise<void> {
    await api.delete(`${ROUTES.users}/${id}`);
  },
  async assignRoles(userId: number, roleIds: number[]): Promise<User> {
    const response = await api.post(`${ROUTES.users}/${userId}/assign-roles`, { roleIds });
    return response.data;
  },
};

export const useGetUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: userService.getUsers })

export const useGetUser = (userId: number) =>
  useQuery({
    queryKey: ['user', userId],
    queryFn: () => userService.getUser(userId),
  })

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

export const useAssignRoles = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, roleIds }: { userId: number; roleIds: number[] }) => 
      userService.assignRoles(userId, roleIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}
