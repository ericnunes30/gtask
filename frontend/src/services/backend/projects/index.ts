import { useOptimizedQuery, useOptimisticMutation, useCacheManager, useQueryClient } from '@/hooks/useOptimizedQuery'
import { queryKeys } from '@/lib/react-query/keys'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import { Project, CreateProjectRequest, UpdateProjectRequest } from '@/common/types'
import { transformApiProjectToFrontend } from '@/utils/apiTransformers'
import { toast } from '@/components/ui/use-toast'

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
  useOptimizedQuery(
    queryKeys.projects.lists(),
    projectService.getProjects,
    {
      onError: (error) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os projetos',
          variant: 'destructive',
        })
      },
    }
  )

export const useGetProject = (projectId?: number | null) =>
  useOptimizedQuery(
    queryKeys.projects.detail(projectId || 0),
    () => projectService.getProject(projectId!),
    {
      enabled: typeof projectId === 'number' && projectId > 0,
      onError: (error) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os detalhes do projeto',
          variant: 'destructive',
        })
      },
    }
  )

export const getProjectQueryOptions = (projectId: number) => ({
  queryKey: queryKeys.projects.detail(projectId),
  queryFn: () => projectService.getProject(projectId),
})

export const useDeleteProject = () => {
  const { setData, removeData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: (id: number) => projectService.deleteProject(id),

    onMutate: async (id) => {
      const project = queryClient.getQueryData(queryKeys.projects.detail(id))

      // Remover otimisticamente
      setData(queryKeys.projects.lists(), (old: any[]) =>
        old?.filter(p => p.id !== id) || []
      )

      // Remover do cache individual
      removeData(queryKeys.projects.detail(id))

      return { deletedProject: project }
    },

    invalidateKeys: [
      queryKeys.projects.lists(),
      queryKeys.tasks.lists(),
    ],

    onSuccess: (_, id) => {
      toast({
        title: 'Sucesso',
        description: 'Projeto excluído com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o projeto',
        variant: 'destructive',
      })
    },
  })
}

export const useCreateProject = () => {
  const { setData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: (data: CreateProjectRequest) => projectService.createProject(data),

    onMutate: async (newProject) => {
      // Cancelar queries relacionadas
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.lists() })

      // Salvar snapshot
      const previousProjects = queryClient.getQueryData(queryKeys.projects.lists())

      // Adicionar projeto otimisticamente
      const optimisticProject = {
        ...newProject,
        id: Date.now(), // ID temporário
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setData(queryKeys.projects.lists(), (old: any) => [...(old || []), optimisticProject])

      return { previousProjects }
    },

    invalidateKeys: [
      queryKeys.projects.lists(),
      queryKeys.tasks.lists(),
    ],

    updateCache: (createdProject) => {
      setData(queryKeys.projects.detail(createdProject.id), createdProject)
    },

    onSuccess: (createdProject) => {
      toast({
        title: 'Sucesso',
        description: 'Projeto criado com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o projeto',
        variant: 'destructive',
      })
    },
  })
}

export const useUpdateProject = () => {
  const { setData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectRequest }) =>
      projectService.updateProject(id, data),

    onMutate: async ({ id, data }) => {
      // Cancelar queries
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(id) })
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.lists() })

      // Snapshots
      const previousProject = queryClient.getQueryData(queryKeys.projects.detail(id))
      const previousProjects = queryClient.getQueryData(queryKeys.projects.lists())

      // Atualização otimista
      setData(queryKeys.projects.detail(id), (old: any) => ({
        ...old,
        ...data,
        updatedAt: new Date().toISOString(),
      }))

      setData(queryKeys.projects.lists(), (old: any[]) =>
        old?.map(project =>
          project.id === id ? { ...project, ...data, updatedAt: new Date().toISOString() } : project
        ) || []
      )

      return { previousProject, previousProjects }
    },

    invalidateKeys: [
      queryKeys.projects.lists(),
      queryKeys.tasks.lists(),
    ],

    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Projeto atualizado com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o projeto',
        variant: 'destructive',
      })
    },
  })
}