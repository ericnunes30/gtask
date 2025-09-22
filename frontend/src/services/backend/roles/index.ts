import { useOptimizedQuery, useOptimisticMutation, useCacheManager } from '@/hooks/useOptimizedQuery'
import { queryKeys } from '@/lib/react-query/keys'
import { CreateRoleRequest, UpdateRoleRequest, Role } from '@/common/types'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import { toast } from '@/components/ui/use-toast'
import { queryClient } from '@/lib/react-query/config'

const roleService = {
  async getRoles(): Promise<Role[]> {
    const response = await api.get<Role[] | { data: Role[] } | Role>(ROUTES.roles)
    const data = response.data

    if (Array.isArray(data)) {
      return data
    }

    if (
      typeof data === 'object' &&
      data !== null &&
      'data' in data &&
      Array.isArray((data as { data: Role[] }).data)
    ) {
      return (data as { data: Role[] }).data
    }

    return [data as Role]
  },
  async getRole(roleId: number): Promise<Role> {
    const response = await api.get(`${ROUTES.roles}/${roleId}`)
    return response.data
  },
  async createRole(data: CreateRoleRequest): Promise<Role> {
    const response = await api.post(ROUTES.roles, data)
    return response.data
  },
  async updateRole(id: number, data: UpdateRoleRequest): Promise<Role> {
    const response = await api.put(`${ROUTES.roles}/${id}`, data)
    return response.data
  },
  async deleteRole(id: number): Promise<void> {
    await api.delete(`${ROUTES.roles}/${id}`)
  },
}

export const useGetRoles = () =>
  useOptimizedQuery(
    queryKeys.roles.lists(),
    roleService.getRoles,
    {
      onError: (error) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os cargos',
          variant: 'destructive',
        })
      },
    }
  )

export const useGetRole = (roleId: number, enabled = true) =>
  useOptimizedQuery(
    queryKeys.roles.detail(roleId),
    () => roleService.getRole(roleId),
    {
      enabled,
      onError: (error) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os detalhes do cargo',
          variant: 'destructive',
        })
      },
    }
  )

export const useCreateRole = () => {
  const { setData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: (data: CreateRoleRequest) => roleService.createRole(data),

    onMutate: async (newRole) => {
      // Cancelar queries relacionadas
      await queryClient.cancelQueries({ queryKey: queryKeys.roles.lists() })

      // Salvar snapshot
      const previousRoles = queryClient.getQueryData(queryKeys.roles.lists())

      // Adicionar cargo otimisticamente
      const optimisticRole = {
        ...newRole,
        id: Date.now(), // ID temporário
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setData(queryKeys.roles.lists(), (old: any) => [...(old || []), optimisticRole])

      return { previousRoles }
    },

    invalidateKeys: [
      queryKeys.roles.lists(),
      queryKeys.users.lists(),
    ],

    updateCache: (createdRole) => {
      setData(queryKeys.roles.detail(createdRole.id), createdRole)
    },

    onSuccess: (createdRole) => {
      toast({
        title: 'Sucesso',
        description: 'Cargo criado com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o cargo',
        variant: 'destructive',
      })
    },
  })
}

export const useUpdateRole = () => {
  const { setData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRoleRequest }) =>
      roleService.updateRole(id, data),

    onMutate: async ({ id, data }) => {
      // Cancelar queries
      await queryClient.cancelQueries({ queryKey: queryKeys.roles.detail(id) })
      await queryClient.cancelQueries({ queryKey: queryKeys.roles.lists() })

      // Snapshots
      const previousRole = queryClient.getQueryData(queryKeys.roles.detail(id))
      const previousRoles = queryClient.getQueryData(queryKeys.roles.lists())

      // Atualização otimista
      setData(queryKeys.roles.detail(id), (old: any) => ({
        ...old,
        ...data,
        updatedAt: new Date().toISOString(),
      }))

      setData(queryKeys.roles.lists(), (old: any[]) =>
        old?.map(role =>
          role.id === id ? { ...role, ...data, updatedAt: new Date().toISOString() } : role
        ) || []
      )

      return { previousRole, previousRoles }
    },

    invalidateKeys: [
      queryKeys.roles.lists(),
      queryKeys.users.lists(),
    ],

    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Cargo atualizado com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o cargo',
        variant: 'destructive',
      })
    },
  })
}

export const useDeleteRole = () => {
  const { setData, removeData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: (id: number) => roleService.deleteRole(id),

    onMutate: async (id) => {
      const role = queryClient.getQueryData(queryKeys.roles.detail(id))

      // Remover otimisticamente
      setData(queryKeys.roles.lists(), (old: any[]) =>
        old?.filter(r => r.id !== id) || []
      )

      // Remover do cache individual
      removeData(queryKeys.roles.detail(id))

      return { deletedRole: role }
    },

    invalidateKeys: [
      queryKeys.roles.lists(),
      queryKeys.users.lists(),
    ],

    onSuccess: (_, id) => {
      toast({
        title: 'Sucesso',
        description: 'Cargo excluído com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o cargo',
        variant: 'destructive',
      })
    },
  })
}
