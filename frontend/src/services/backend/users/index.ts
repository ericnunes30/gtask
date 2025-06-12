import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { CreateUserRequest, UpdateUserRequest, User } from '@/common/types'
import API_URL from '@/services/api'

const userService = {
  async getUsers(): Promise<User[]> {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
  async getUser(userId: number): Promise<User> {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
  async createUser(data: CreateUserRequest): Promise<User> {
    const token = localStorage.getItem('token')
    const response = await axios.post(`${API_URL}/user`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
  async updateUser(id: number, data: UpdateUserRequest): Promise<User> {
    const token = localStorage.getItem('token')
    const response = await axios.put(`${API_URL}/user/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
  async deleteUser(id: number): Promise<void> {
    const token = localStorage.getItem('token')
    await axios.delete(`${API_URL}/user/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

export const useGetUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: userService.getUsers })

export const useGetUser = (userId: number) =>
  useQuery({
    queryKey: ['user', userId],
    queryFn: () => userService.getUser(userId),
  })

interface MutateUserArgs {
  id?: number
  data: CreateUserRequest | UpdateUserRequest
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: MutateUserArgs) =>
      id
        ? userService.updateUser(id, data as UpdateUserRequest)
        : userService.createUser(data as CreateUserRequest),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => userService.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}
