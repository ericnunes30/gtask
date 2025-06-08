import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import projectService from '@/lib/api/projects'

export const useGetProjects = () =>
  useQuery({ queryKey: ['projects'], queryFn: projectService.getProjects })

export const useCreateProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: projectService.createProject,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}
