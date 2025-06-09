import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import teamService, {
  CreateTeamRequest,
  UpdateTeamRequest,
  AddUserToTeamRequest,
} from '@/lib/api/teams'

export const useGetTeams = () =>
  useQuery({ queryKey: ['teams'], queryFn: teamService.getTeams })

export const useCreateTeam = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTeamRequest) => teamService.createTeam(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  })
}

export const useUpdateTeam = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTeamRequest }) =>
      teamService.updateTeam(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  })
}

export const useDeleteTeam = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => teamService.deleteTeam(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  })
}

export const useAddUserToTeam = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      teamId,
      data,
    }: {
      teamId: number
      data: AddUserToTeamRequest
    }) => teamService.addUserToTeam(teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
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
    }) => teamService.removeUserFromTeam(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export const getTeamUsersQueryOptions = (teamId: number) => ({
  queryKey: ['teamUsers', teamId],
  queryFn: () => teamService.getTeamUsers(teamId),
})

export const useGetTeamUsers = (teamId: number, enabled = true) =>
  useQuery({ ...getTeamUsersQueryOptions(teamId), enabled })
