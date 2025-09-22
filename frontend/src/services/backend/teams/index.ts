import { useOptimizedQuery, useOptimisticMutation, useCacheManager, useQueryClient } from '@/hooks/useOptimizedQuery'
import { queryKeys } from '@/lib/react-query/keys'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import { CreateTeamRequest, UpdateTeamRequest, Team, UserOccupation } from '@/common/types'
import { toast } from '@/components/ui/use-toast'

const teamService = { // Renomeado occupationService para teamService
  async getTeams(): Promise<Team[]> {
    const response = await api.get(ROUTES.occupations)
    return response.data.data
  },
  async getTeam(teamId: number): Promise<Team> {
    const response = await api.get(`${ROUTES.occupations}/${teamId}`)
    return response.data.data
  },
  async createTeam(data: CreateTeamRequest): Promise<Team> {
    const response = await api.post(ROUTES.occupations, data)
    return response.data.data
  },
  async updateTeam(id: number, data: UpdateTeamRequest): Promise<Team> {
    const response = await api.put(`${ROUTES.occupations}/${id}`, data)
    return response.data.data
  },
  async deleteTeam(id: number): Promise<void> {
    await api.delete(`${ROUTES.occupations}/${id}`)
  },
}

const teamUserService = { // Renomeado occupationUserService para teamUserService
  async addUserToTeam(
    teamId: number,
    userId: number,
  ): Promise<Team> {
    const response = await api.post(
      `${ROUTES.occupations}/${teamId}/users`,
      { userId }
    )
    return response.data.data
  },

  async removeUserFromTeam(
    teamId: number,
    userId: number,
  ): Promise<void> {
    await api.delete(`${ROUTES.occupations}/${teamId}/users/${userId}`)
  },

  async getTeamUsers(teamId: number): Promise<UserOccupation[]> {
    const response = await api.get(
      `${ROUTES.occupations}/${teamId}/users`
    )
    return response.data.data
  },
}

export const useGetTeams = () =>
  useOptimizedQuery(
    queryKeys.teams.lists(),
    teamService.getTeams,
    {
      onError: (error) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as equipes',
          variant: 'destructive',
        })
      },
    }
  )

export const useGetTeam = (teamId: number, enabled = true) =>
  useOptimizedQuery(
    queryKeys.teams.detail(teamId),
    () => teamService.getTeam(teamId),
    {
      enabled,
      onError: (error) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os detalhes da equipe',
          variant: 'destructive',
        })
      },
    }
  )

export const useCreateTeam = () => {
  const { setData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: (data: CreateTeamRequest) => teamService.createTeam(data),

    onMutate: async (newTeam) => {
      // Cancelar queries relacionadas
      await queryClient.cancelQueries({ queryKey: queryKeys.teams.lists() })

      // Salvar snapshot
      const previousTeams = queryClient.getQueryData(queryKeys.teams.lists())

      // Adicionar equipe otimisticamente
      const optimisticTeam = {
        ...newTeam,
        id: Date.now(), // ID temporário
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setData(queryKeys.teams.lists(), (old: any) => [...(old || []), optimisticTeam])

      return { previousTeams }
    },

    invalidateKeys: [queryKeys.teams.lists()],

    updateCache: (createdTeam) => {
      setData(queryKeys.teams.detail(createdTeam.id), createdTeam)
    },

    onSuccess: (createdTeam) => {
      toast({
        title: 'Sucesso',
        description: 'Equipe criada com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a equipe',
        variant: 'destructive',
      })
    },
  })
}

export const useUpdateTeam = () => {
  const { setData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTeamRequest }) =>
      teamService.updateTeam(id, data),

    onMutate: async ({ id, data }) => {
      // Cancelar queries
      await queryClient.cancelQueries({ queryKey: queryKeys.teams.detail(id) })
      await queryClient.cancelQueries({ queryKey: queryKeys.teams.lists() })

      // Snapshots
      const previousTeam = queryClient.getQueryData(queryKeys.teams.detail(id))
      const previousTeams = queryClient.getQueryData(queryKeys.teams.lists())

      // Atualização otimista
      setData(queryKeys.teams.detail(id), (old: any) => ({
        ...old,
        ...data,
        updatedAt: new Date().toISOString(),
      }))

      setData(queryKeys.teams.lists(), (old: any[]) =>
        old?.map(team =>
          team.id === id ? { ...team, ...data, updatedAt: new Date().toISOString() } : team
        ) || []
      )

      return { previousTeam, previousTeams }
    },

    invalidateKeys: [queryKeys.teams.lists()],

    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Equipe atualizada com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a equipe',
        variant: 'destructive',
      })
    },
  })
}

export const useDeleteTeam = () => {
  const { setData, removeData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: (id: number) => teamService.deleteTeam(id),

    onMutate: async (id) => {
      const team = queryClient.getQueryData(queryKeys.teams.detail(id))

      // Remover otimisticamente
      setData(queryKeys.teams.lists(), (old: any[]) =>
        old?.filter(t => t.id !== id) || []
      )

      // Remover do cache individual
      removeData(queryKeys.teams.detail(id))

      return { deletedTeam: team }
    },

    invalidateKeys: [queryKeys.teams.lists()],

    onSuccess: (_, id) => {
      toast({
        title: 'Sucesso',
        description: 'Equipe excluída com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a equipe',
        variant: 'destructive',
      })
    },
  })
}

export const useAddUserToTeam = () => {
  return useOptimisticMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) =>
      teamUserService.addUserToTeam(teamId, userId),

    invalidateKeys: [
      queryKeys.teams.lists(),
      queryKeys.users.lists(),
    ],

    onSuccess: (_, { teamId }) => {
      toast({
        title: 'Sucesso',
        description: 'Usuário adicionado à equipe com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o usuário à equipe',
        variant: 'destructive',
      })
    },
  })
}

export const useRemoveUserFromTeam = () => {
  return useOptimisticMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) =>
      teamUserService.removeUserFromTeam(teamId, userId),

    invalidateKeys: [
      queryKeys.teams.lists(),
      queryKeys.users.lists(),
    ],

    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Usuário removido da equipe com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o usuário da equipe',
        variant: 'destructive',
      })
    },
  })
}

// Commented out as the backend endpoint doesn't exist
// export const getTeamUsersQueryOptions = (teamId: number) => ({ // Renomeado getOccupationUsersQueryOptions
//   queryKey: ['teamUsers', teamId], // Alterado queryKey para 'teamUsers'
//   queryFn: () => teamUserService.getTeamUsers(teamId), // Renomeado occupationUserService.getOccupationUsers
// })

// export const useGetTeamUsers = (teamId: number) => // Renomeado useGetOccupationUsers
//   useQuery(getTeamUsersQueryOptions(teamId)) // Renomeado getOccupationUsersQueryOptions
