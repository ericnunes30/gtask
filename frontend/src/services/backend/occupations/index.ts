import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import { Team } from '@/common/types'

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
  useQuery({ 
    queryKey: ['occupations'], 
    queryFn: async () => {
      console.log('Fetching occupations from API...');
      try {
        const occupations = await occupationService.getOccupations();
        console.log('Occupations fetched successfully:', occupations);
        return occupations;
      } catch (error) {
        console.error('Error fetching occupations:', error);
        throw error;
      }
    }
  })

export const useGetOccupation = (occupationId: number, enabled = true) =>
  useQuery({
    queryKey: ['occupation', occupationId],
    queryFn: () => occupationService.getOccupation(occupationId),
    enabled,
  })

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

export const useAddUserToOccupation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      occupationId,
      userId,
    }: {
      occupationId: number
      userId: number
    }) => occupationUserService.addUserToOccupation(occupationId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['occupations'] })
      queryClient.invalidateQueries({
        queryKey: ['occupationUsers', variables.occupationId],
      })
    },
  })
}

export const useRemoveUserFromOccupation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      occupationId,
      userId,
    }: {
      occupationId: number
      userId: number
    }) => occupationUserService.removeUserFromOccupation(occupationId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['occupations'] })
      queryClient.invalidateQueries({
        queryKey: ['occupationUsers', variables.occupationId],
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
