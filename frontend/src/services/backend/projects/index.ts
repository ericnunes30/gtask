import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Project, CreateProjectRequest, UpdateProjectRequest } from '@/common/types'
import { transformApiProjectToFrontend } from '@/utils/apiTransformers'
import API_URL from '@/services/api'

const projectService = {
  async getProjects(): Promise<Project[]> {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/project`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data.map(transformApiProjectToFrontend)
  },

  async getProject(id: number): Promise<Project> {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/project/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return transformApiProjectToFrontend(response.data)
  },

  async createProject(data: CreateProjectRequest): Promise<Project> {
    const token = localStorage.getItem('token')
    const response = await axios.post(`${API_URL}/project`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data.map(transformApiProjectToFrontend)
  },

  async updateProject(id: number, data: UpdateProjectRequest): Promise<Project> {
    const token = localStorage.getItem('token')
    const response = await axios.put(`${API_URL}/project/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return transformApiProjectToFrontend(response.data)
  },

  async deleteProject(id: number): Promise<void> {
    const token = localStorage.getItem('token')
    await axios.delete(`${API_URL}/project/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },
}

export const useGetProjects = () =>
  useQuery({ queryKey: ['projects'], queryFn: projectService.getProjects })

export const useGetProject = (projectId: number, enabled = true) =>
  useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId),
    enabled,
  })

export const getProjectQueryOptions = (projectId: number) => ({
  queryKey: ['project', projectId],
  queryFn: () => projectService.getProject(projectId),
})

interface MutateProjectArgs {
  id?: number
  data: CreateProjectRequest | UpdateProjectRequest
}

export const useCreateProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: MutateProjectArgs) =>
      id
        ? projectService.updateProject(id, data as UpdateProjectRequest)
        : projectService.createProject(data as CreateProjectRequest),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export const useDeleteProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => projectService.deleteProject(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}
