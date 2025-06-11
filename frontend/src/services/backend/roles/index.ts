import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { CreateRoleRequest, UpdateRoleRequest, Role } from '@/common/types'

const API_URL = 'http://localhost:3333'

const roleService = {
  async getRoles(): Promise<Role[]> {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/role`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },
  async getRole(roleId: number): Promise<Role> {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/role/${roleId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },
  async createRole(data: CreateRoleRequest): Promise<Role> {
    const token = localStorage.getItem('token')
    const response = await axios.post(`${API_URL}/role`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },
  async updateRole(id: number, data: UpdateRoleRequest): Promise<Role> {
    const token = localStorage.getItem('token')
    const response = await axios.put(`${API_URL}/role/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },
  async deleteRole(id: number): Promise<void> {
    const token = localStorage.getItem('token')
    await axios.delete(`${API_URL}/role/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },
}

export const useGetRoles = () =>
  useQuery({ queryKey: ['roles'], queryFn: roleService.getRoles })

export const useGetRole = (roleId: number, enabled = true) =>
  useQuery({
    queryKey: ['role', roleId],
    queryFn: () => roleService.getRole(roleId),
    enabled,
  })

export const useCreateRole = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRoleRequest) => roleService.createRole(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export const useUpdateRole = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRoleRequest }) =>
      roleService.updateRole(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export const useDeleteRole = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => roleService.deleteRole(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}
