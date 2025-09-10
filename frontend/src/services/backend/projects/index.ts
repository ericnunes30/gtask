import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import { Project, CreateProjectRequest, UpdateProjectRequest } from '@/common/types'
import { transformApiProjectToFrontend } from '@/utils/apiTransformers'

const projectService = {
  async getProjects(): Promise<Project[]> {
    const response = await api.get(ROUTES.projects)
    return response.data.data.map(transformApiProjectToFrontend)
  },

  async getProject(id: number): Promise<Project> {
    const response = await api.get(`${ROUTES.projects}/${id}`)
    return transformApiProjectToFrontend(response.data.data)
  },

  async createProject(data: CreateProjectRequest): Promise<Project> {
    const response = await api.post(ROUTES.projects, data)
    return transformApiProjectToFrontend(response.data.data)
  },

  async updateProject(id: number, data: UpdateProjectRequest): Promise<Project> {
    const response = await api.put(`${ROUTES.projects}/${id}`, data)
    return transformApiProjectToFrontend(response.data.data)
  },

  async deleteProject(id: number): Promise<void> {
    await api.delete(`${ROUTES.projects}/${id}`)
  },
}

export const useGetProjects = () =>
  useQuery({ queryKey: ['projects'], queryFn: projectService.getProjects })

export const useGetProject = (projectId?: number | null) =>
  useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId!),
    enabled: typeof projectId === 'number' && projectId > 0,
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
    onSuccess: (result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['project', id] })
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
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