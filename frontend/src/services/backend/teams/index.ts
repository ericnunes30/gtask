import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import teamService, {
  CreateTeamRequest,
  UpdateTeamRequest,
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
