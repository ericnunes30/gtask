import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { CreateOccupationRequest, UpdateOccupationRequest, Occupation, UserOccupation } from '@/common/types'
import API_URL from '@/services/api'

const occupationService = {
  async getOccupations(): Promise<Occupation[]> {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/occupation`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },
  async getOccupation(occupationId: number): Promise<Occupation> {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/occupation/${occupationId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },
  async createOccupation(data: CreateOccupationRequest): Promise<Occupation> {
    const token = localStorage.getItem('token')
    const response = await axios.post(`${API_URL}/occupation`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },
  async updateOccupation(id: number, data: UpdateOccupationRequest): Promise<Occupation> {
    const token = localStorage.getItem('token')
    const response = await axios.put(`${API_URL}/occupation/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },
  async deleteOccupation(id: number): Promise<void> {
    const token = localStorage.getItem('token')
    await axios.delete(`${API_URL}/occupation/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },
}

const occupationUserService = {
  async addUserToOccupation(
    occupationId: number,
    userId: number,
  ): Promise<Occupation> {
    const token = localStorage.getItem('token')
    const response = await axios.post(
      `${API_URL}/occupation/${occupationId}/users`,
      { userId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    return response.data
  },

  async removeUserFromOccupation(
    occupationId: number,
    userId: number,
  ): Promise<void> {
    const token = localStorage.getItem('token')
    await axios.delete(`${API_URL}/occupation/${occupationId}/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },

  async getOccupationUsers(occupationId: number): Promise<UserOccupation[]> {
    const token = localStorage.getItem('token')
    const response = await axios.get(
      `${API_URL}/occupation/${occupationId}/users`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    return response.data
  },
}

export const useGetOccupations = () =>
  useQuery({ queryKey: ['occupations'], queryFn: occupationService.getOccupations })

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
