import { useOptimizedQuery, useOptimisticMutation, useCacheManager, useQueryClient } from '@/hooks/useOptimizedQuery'
import { queryKeys } from '@/lib/react-query/keys'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import { CreateUserRequest, UpdateUserRequest, User } from '@/common/types'
import { toast } from '@/components/ui/use-toast'
import { queryClient as queryClientInstance } from '@/lib/react-query/config'
import { useQueryClient as useQueryClientHook } from '@tanstack/react-query'

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
  useOptimizedQuery(
    queryKeys.users.lists(),
    userService.getUsers,
    {
      onError: (error) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os usuários',
          variant: 'destructive',
        })
      },
    }
  )

export const useGetUser = (userId: number) =>
  useOptimizedQuery(
    queryKeys.users.detail(userId),
    () => userService.getUser(userId),
    {
      onError: (error) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os detalhes do usuário',
          variant: 'destructive',
        })
      },
    }
  )

export const useCreateUser = () => {
  const { setData } = useCacheManager()
  const queryClient = useQueryClientHook()

  return useOptimisticMutation({
    mutationFn: (data: CreateUserRequest) => userService.createUser(data),

    onMutate: async (newUser) => {
      // Cancelar queries relacionadas
      await queryClient.cancelQueries({ queryKey: queryKeys.users.lists() })

      // Salvar snapshot
      const previousUsers = queryClient.getQueryData(queryKeys.users.lists())

      // Adicionar usuário otimisticamente
      const optimisticUser = {
        ...newUser,
        id: Date.now(), // ID temporário
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setData(queryKeys.users.lists(), (old: any) => [...(old || []), optimisticUser])

      return { previousUsers }
    },

    invalidateKeys: [
      queryKeys.users.lists(),
      queryKeys.roles.lists(),
    ],

    updateCache: (createdUser) => {
      setData(queryKeys.users.detail(createdUser.id), createdUser)
    },

    onSuccess: (createdUser) => {
      toast({
        title: 'Sucesso',
        description: 'Usuário criado com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o usuário',
        variant: 'destructive',
      })
    },
  })
}

export const useUpdateUser = () => {
  const { setData } = useCacheManager()
  const queryClient = useQueryClientHook()

  return useOptimisticMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) =>
      userService.updateUser(id, data),

    onMutate: async ({ id, data }) => {
      // Cancelar queries
      await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(id) })
      await queryClient.cancelQueries({ queryKey: queryKeys.users.lists() })

      // Snapshots
      const previousUser = queryClient.getQueryData(queryKeys.users.detail(id))
      const previousUsers = queryClient.getQueryData(queryKeys.users.lists())

      // Atualização otimista
      setData(queryKeys.users.detail(id), (old: any) => ({
        ...old,
        ...data,
        updatedAt: new Date().toISOString(),
      }))

      setData(queryKeys.users.lists(), (old: any[]) =>
        old?.map(user =>
          user.id === id ? { ...user, ...data, updatedAt: new Date().toISOString() } : user
        ) || []
      )

      return { previousUser, previousUsers }
    },

    invalidateKeys: [
      queryKeys.users.lists(),
      queryKeys.roles.lists(),
    ],

    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Usuário atualizado com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o usuário',
        variant: 'destructive',
      })
    },
  })
}

export const useDeleteUser = () => {
  const { setData, removeData } = useCacheManager()
  const queryClient = useQueryClientHook()

  return useOptimisticMutation({
    mutationFn: (id: number) => userService.deleteUser(id),

    onMutate: async (id) => {
      const user = queryClient.getQueryData(queryKeys.users.detail(id))

      // Remover otimisticamente
      setData(queryKeys.users.lists(), (old: any[]) =>
        old?.filter(u => u.id !== id) || []
      )

      // Remover do cache individual
      removeData(queryKeys.users.detail(id))

      return { deletedUser: user }
    },

    invalidateKeys: [
      queryKeys.users.lists(),
      queryKeys.roles.lists(),
    ],

    onSuccess: (_, id) => {
      toast({
        title: 'Sucesso',
        description: 'Usuário excluído com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o usuário',
        variant: 'destructive',
      })
    },
  })
}

export const useAssignRoles = () => {
  return useOptimisticMutation({
    mutationFn: ({ userId, roleIds }: { userId: number; roleIds: number[] }) =>
      userService.assignRoles(userId, roleIds),

    invalidateKeys: [
      queryKeys.users.lists(),
      queryKeys.roles.lists(),
    ],

    onSuccess: (_, { userId }) => {
      toast({
        title: 'Sucesso',
        description: 'Permissões atribuídas com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atribuir as permissões',
        variant: 'destructive',
      })
    },
  })
}
