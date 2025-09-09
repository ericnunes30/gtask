import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreateRoleRequest, UpdateRoleRequest, Role } from '@/common/types'
import { api } from '@/services/backend/api'

import { ROUTES } from '@/services/backend/routes'

const roleService = {
  async getRoles(): Promise<Role[]> {
    const response = await api.get(ROUTES.roles)
    // Support APIs that return either:
    //  - an array directly in response.data, or
    //  - a paginated wrapper { data: [...] } in response.data.data
    if (response?.data && Array.isArray(response.data)) {
      return response.data as Role[];
    }
    if (response?.data && response.data.data && Array.isArray(response.data.data)) {
      return response.data.data as Role[];
    }
    // Fallback to whatever the endpoint returned (could be a single object)
    return response.data as any;
  },
  async getRole(roleId: number): Promise<Role> {
    const response = await api.get(`/role/${roleId}`)
    return response.data
  },
  async createRole(data: CreateRoleRequest): Promise<Role> {
    const response = await api.post('/role', data)
    return response.data
  },
  async updateRole(id: number, data: UpdateRoleRequest): Promise<Role> {
    const response = await api.put(`/role/${id}`, data)
    return response.data
  },
  async deleteRole(id: number): Promise<void> {
    await api.delete(`/role/${id}`)
  },
}

export const useGetRoles = () =>
  useQuery({ 
    queryKey: ['roles'], 
    queryFn: async () => {
      console.log('Fetching roles from API...');
      try {
        const roles = await roleService.getRoles();
        console.log('Roles fetched successfully:', roles);
        return roles;
      } catch (error) {
        console.error('Error fetching roles:', error);
        throw error;
      }
    }
  })

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
