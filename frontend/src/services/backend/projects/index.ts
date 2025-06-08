import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import projectService, {
  CreateProjectRequest,
  UpdateProjectRequest,
} from '@/lib/api/projects'

export const useGetProjects = () =>
  useQuery({ queryKey: ['projects'], queryFn: projectService.getProjects })

export const useGetProject = (projectId: number, enabled = true) =>
  useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId),
    enabled,
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
