import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import occupationService, {
  CreateOccupationRequest,
  UpdateOccupationRequest,
} from '@/lib/api/occupations'

export const useGetOccupations = () =>
  useQuery({ queryKey: ['occupations'], queryFn: occupationService.getOccupations })

export const useCreateOccupation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateOccupationRequest) =>
      occupationService.createOccupation(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['occupations'] }),
  })
}

export const useUpdateOccupation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateOccupationRequest }) =>
      occupationService.updateOccupation(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['occupations'] }),
  })
}

export const useDeleteOccupation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => occupationService.deleteOccupation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['occupations'] }),
  })
}
