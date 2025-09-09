import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import { CreateTeamRequest, UpdateTeamRequest, Team, UserOccupation } from '@/common/types'

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

export const useGetTeams = () => // Renomeado useGetOccupations para useGetTeams
  useQuery({ queryKey: ['teams'], queryFn: teamService.getTeams }) // Alterado queryKey para 'teams'

export const useGetTeam = (teamId: number, enabled = true) => // Renomeado useGetOccupation para useGetTeam
  useQuery({
    queryKey: ['team', teamId], // Alterado queryKey para 'team'
    queryFn: () => teamService.getTeam(teamId), // Renomeado getOccupation para getTeam
    enabled,
  })

export const useCreateTeam = () => { // Renomeado useCreateOccupation para useCreateTeam
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTeamRequest) => // Alterado CreateOccupationRequest para CreateTeamRequest
      teamService.createTeam(data), // Renomeado createOccupation para createTeam
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }), // Alterado queryKey para 'teams'
  })
}

export const useUpdateTeam = () => { // Renomeado useUpdateOccupation para useUpdateTeam
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTeamRequest }) => // Alterado UpdateOccupationRequest para UpdateTeamRequest
      teamService.updateTeam(id, data), // Renomeado updateOccupation para updateTeam
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }), // Alterado queryKey para 'teams'
  })
}

export const useDeleteTeam = () => { // Renomeado useDeleteOccupation para useDeleteTeam
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => teamService.deleteTeam(id), // Renomeado deleteOccupation para deleteTeam
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }), // Alterado queryKey para 'teams'
  })
}

export const useAddUserToTeam = () => { // Renomeado useAddUserToOccupation para useAddUserToTeam
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      teamId, // Renomeado occupationId para teamId
      userId,
    }: {
      teamId: number // Renomeado occupationId para teamId
      userId: number
    }) => teamUserService.addUserToTeam(teamId, userId), // Renomeado occupationUserService.addUserToOccupation
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] }) // Alterado queryKey para 'teams'
      queryClient.invalidateQueries({
        queryKey: ['teamUsers', variables.teamId], // Alterado queryKey para 'teamUsers' e variables.occupationId para variables.teamId
      })
    },
  })
}

export const useRemoveUserFromTeam = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      teamId,
      userId,
    }: {
      teamId: number
      userId: number
    }) => teamUserService.removeUserFromTeam(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
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