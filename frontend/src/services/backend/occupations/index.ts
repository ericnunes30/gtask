import { useOptimizedQuery, useOptimisticMutation, useCacheManager } from '@/hooks/useOptimizedQuery'
import { queryKeys } from '@/lib/react-query/keys'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import { Team } from '@/utils/commonTypes'
import { toast } from '@/components/ui/use-toast'
import { queryClient } from '@/lib/react-query/config'

interface CreateOccupationRequest {
  name: string
  description?: string
}

interface UpdateOccupationRequest {
  name?: string
  description?: string
}

interface UserOccupation {
  id: number
  name: string
  email: string
}

const occupationService = {
  async getOccupations(): Promise<Team[]> {
    const response = await api.get(ROUTES.occupations)
    if (response?.data && Array.isArray(response.data)) {
      return response.data as Team[];
    }
    if (response?.data && response.data.data && Array.isArray(response.data.data)) {
      return response.data.data as Team[];
    }
    return response.data as any;
  },
  async getOccupation(occupationId: number): Promise<Team> {
    const response = await api.get(`${ROUTES.occupations}/${occupationId}`)
    return response.data.data
  },
  async createOccupation(data: CreateOccupationRequest): Promise<Team> {
    const response = await api.post(ROUTES.occupations, data)
    return response.data.data
  },
  async updateOccupation(id: number, data: UpdateOccupationRequest): Promise<Team> {
    const response = await api.put(`${ROUTES.occupations}/${id}`, data)
    return response.data.data
  },
  async deleteOccupation(id: number): Promise<void> {
    await api.delete(`${ROUTES.occupations}/${id}`)
  },
}

const occupationUserService = {
  async addUserToOccupation(
    occupationId: number,
    userId: number,
  ): Promise<Team> {
    const response = await api.post(
      `${ROUTES.occupations}/${occupationId}/users`,
      { userId }
    )
    // Support APIs that return either response.data or response.data.data
    if (response?.data && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },

  async removeUserFromOccupation(
    occupationId: number,
    userId: number,
  ): Promise<void> {
    await api.delete(`${ROUTES.occupations}/${occupationId}/users/${userId}`)
  },

  async getOccupationUsers(occupationId: number): Promise<UserOccupation[]> {
    const response = await api.get(
      `${ROUTES.occupations}/${occupationId}/users`
    )
    return response.data.data
  },
}

export const useGetOccupations = () =>
  useOptimizedQuery(
    queryKeys.occupations.lists(),
    occupationService.getOccupations,
    {
      onError: (error) => {
        console.error('Error fetching occupations:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as ocupações',
          variant: 'destructive',
        })
      },
    }
  )

export const useGetOccupation = (occupationId: number, enabled = true) =>
  useOptimizedQuery(
    queryKeys.occupations.detail(occupationId),
    () => occupationService.getOccupation(occupationId),
    {
      enabled,
      onError: (error) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os detalhes da ocupação',
          variant: 'destructive',
        })
      },
    }
  )

export const useCreateOccupation = () => {
  const { setData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: (data: CreateOccupationRequest) =>
      occupationService.createOccupation(data),

    onMutate: async (newOccupation) => {
      // Cancelar queries relacionadas
      await queryClient.cancelQueries({ queryKey: queryKeys.occupations.lists() })

      // Salvar snapshot
      const previousOccupations = queryClient.getQueryData(queryKeys.occupations.lists())

      // Adicionar ocupação otimisticamente
      const optimisticOccupation = {
        ...newOccupation,
        id: Date.now(), // ID temporário
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setData(queryKeys.occupations.lists(), (old: any) => [...(old || []), optimisticOccupation])

      return { previousOccupations }
    },

    invalidateKeys: [queryKeys.occupations.lists()],

    updateCache: (createdOccupation) => {
      setData(queryKeys.occupations.detail(createdOccupation.id), createdOccupation)
    },

    onSuccess: (createdOccupation) => {
      toast({
        title: 'Sucesso',
        description: 'Ocupação criada com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a ocupação',
        variant: 'destructive',
      })
    },
  })
}

export const useUpdateOccupation = () => {
  const { setData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateOccupationRequest }) =>
      occupationService.updateOccupation(id, data),

    onMutate: async ({ id, data }) => {
      // Cancelar queries
      await queryClient.cancelQueries({ queryKey: queryKeys.occupations.detail(id) })
      await queryClient.cancelQueries({ queryKey: queryKeys.occupations.lists() })

      // Snapshots
      const previousOccupation = queryClient.getQueryData(queryKeys.occupations.detail(id))
      const previousOccupations = queryClient.getQueryData(queryKeys.occupations.lists())

      // Atualização otimista
      setData(queryKeys.occupations.detail(id), (old: any) => ({
        ...old,
        ...data,
        updatedAt: new Date().toISOString(),
      }))

      setData(queryKeys.occupations.lists(), (old: any[]) =>
        old?.map(occupation =>
          occupation.id === id ? { ...occupation, ...data, updatedAt: new Date().toISOString() } : occupation
        ) || []
      )

      return { previousOccupation, previousOccupations }
    },

    invalidateKeys: [queryKeys.occupations.lists()],

    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Ocupação atualizada com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a ocupação',
        variant: 'destructive',
      })
    },
  })
}

export const useDeleteOccupation = () => {
  const { setData, removeData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: (id: number) => occupationService.deleteOccupation(id),

    onMutate: async (id) => {
      const occupation = queryClient.getQueryData(queryKeys.occupations.detail(id))

      // Remover otimisticamente
      setData(queryKeys.occupations.lists(), (old: any[]) =>
        old?.filter(o => o.id !== id) || []
      )

      // Remover do cache individual
      removeData(queryKeys.occupations.detail(id))

      return { deletedOccupation: occupation }
    },

    invalidateKeys: [queryKeys.occupations.lists()],

    onSuccess: (_, id) => {
      toast({
        title: 'Sucesso',
        description: 'Ocupação excluída com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a ocupação',
        variant: 'destructive',
      })
    },
  })
}

export const useAddUserToOccupation = () => {
  return useOptimisticMutation({
    mutationFn: ({ occupationId, userId }: { occupationId: number; userId: number }) =>
      occupationUserService.addUserToOccupation(occupationId, userId),

    invalidateKeys: [
      queryKeys.occupations.lists(),
      queryKeys.users.lists(),
    ],

    onSuccess: (_, { occupationId }) => {
      toast({
        title: 'Sucesso',
        description: 'Usuário adicionado à ocupação com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o usuário à ocupação',
        variant: 'destructive',
      })
    },
  })
}

export const useRemoveUserFromOccupation = () => {
  return useOptimisticMutation({
    mutationFn: ({ occupationId, userId }: { occupationId: number; userId: number }) =>
      occupationUserService.removeUserFromOccupation(occupationId, userId),

    invalidateKeys: [
      queryKeys.occupations.lists(),
      queryKeys.users.lists(),
    ],

    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Usuário removido da ocupação com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o usuário da ocupação',
        variant: 'destructive',
      })
    },
  })
}

// Commented out as the backend endpoint doesn't exist
// export const getOccupationUsersQueryOptions = (occupationId: number) => ({
//   queryKey: ['occupationUsers', occupationId],
//   queryFn: () => occupationUserService.getOccupationUsers(occupationId),
// })

// export const useGetOccupationUsers = (occupationId: number) =>
//   useQuery(getOccupationUsersQueryOptions(occupationId))