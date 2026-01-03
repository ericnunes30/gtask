// Exemplos de como usar as otimizações do React Query

import { useOptimizedQuery, useOptimisticMutation, usePrefetch, useCacheManager } from '@/hooks/useOptimizedQuery'
import { queryKeys } from './keys'
import { toast } from '@/components/ui/use-toast'

// Exemplo 1: Query otimizada com estratégia de cache
export function useGetProjects() {
  return useOptimizedQuery(
    queryKeys.projects.lists(),
    () => fetch('/api/projects').then(res => res.json()),
    {
      // Sobrescrever estratégia padrão se necessário
      staleTime: 1000 * 60 * 10, // 10 minutos em vez de 5
    }
  )
}

// Exemplo 2: Mutation com optimistic updates
export function useCreateProject() {
  const { setData } = useCacheManager()

  return useOptimisticMutation(
    {
      mutationFn: (data: CreateProjectRequest) =>
        fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).then(res => res.json()),

      // Atualizar cache optimisticamente
      onMutate: async (newProject) => {
        // Cancelar queries relacionadas
        await queryClient.cancelQueries({ queryKey: queryKeys.projects.lists() })

        // Snapshot do estado anterior
        const previousProjects = queryClient.getQueryData(queryKeys.projects.lists())

        // Adicionar projeto otimisticamente
        queryClient.setQueryData(queryKeys.projects.lists(), (old: any) => [
          ...(old || []),
          { ...newProject, id: 'temp-id', createdAt: new Date().toISOString() },
        ])

        return { previousProjects }
      },

      // Invalidar queries em caso de sucesso
      invalidateKeys: [
        queryKeys.projects.lists(),
        queryKeys.dashboard.overview(),
      ],

      // Atualizar cache com dados reais
      updateCache: (newProject) => {
        setData(queryKeys.projects.detail(newProject.id), newProject)
      },

      onSuccess: () => {
        toast({
          title: 'Sucesso',
          description: 'Projeto criado com sucesso',
        })
      },
    }
  )
}

// Exemplo 3: Query em tempo real para notificações
export function useNotifications() {
  return useOptimizedQuery(
    queryKeys.notifications.lists(),
    () => fetch('/api/notifications').then(res => res.json()),
    {
      // A estratégia REALTIME será aplicada automaticamente
    }
  )
}

// Exemplo 4: Prefetching em hover
export function useProjectPrefetch() {
  const { prefetch } = usePrefetch()

  const prefetchProject = (projectId: string) => {
    prefetch(
      queryKeys.projects.detail(projectId),
      () => fetch(`/api/projects/${projectId}`).then(res => res.json()),
      {
        staleTime: 1000 * 60 * 5, // 5 minutos
      }
    )
  }

  return { prefetchProject }
}

// Exemplo 5: Query dependente
export function useProjectTasks(projectId: string | undefined) {
  return useDependentQuery(
    queryKeys.tasks.byProject(projectId || ''),
    () => fetch(`/api/projects/${projectId}/tasks`).then(res => res.json()),
    [projectId], // Só executar se projectId existir
    {
      enabled: !!projectId,
    }
  )
}

// Exemplo 6: Paginação otimizada
export function useUsersPaginated() {
  const fetchUsers = (page: number) =>
    fetch(`/api/users?page=${page}&limit=10`)
      .then(res => res.json())

  return usePaginatedQuery(
    queryKeys.users.lists(),
    fetchUsers,
    {
      pageSize: 10,
      keepPreviousData: true,
    }
  )
}

// Exemplo 7: Mutation com atualização específica
export function useUpdateTaskStatus() {
  const { setData, invalidate } = useCacheManager()

  return useOptimisticMutation(
    {
      mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
        fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }).then(res => res.json()),

      onMutate: async ({ taskId, status }) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) })

        const previousTask = queryClient.getQueryData(queryKeys.tasks.detail(taskId))

        // Atualizar status otimisticamente
        setData(queryKeys.tasks.detail(taskId), (old: any) => ({
          ...old,
          status,
          updatedAt: new Date().toISOString(),
        }))

        return { previousTask }
      },

      // Invalidar queries relacionadas
      invalidateKeys: [
        queryKeys.tasks.lists(),
        queryKeys.projects.lists(),
      ],

      onSuccess: (updatedTask) => {
        // Atualizar dados relacionados
        invalidate(queryKeys.projects.detail(updatedTask.projectId))

        toast({
          title: 'Sucesso',
          description: 'Status da tarefa atualizado',
        })
      },
    }
  )
}

// Exemplo 8: Query com tratamento de erro customizado
export function useUserProfile(userId: string) {
  return useOptimizedQuery(
    queryKeys.users.detail(userId),
    () => fetch(`/api/users/${userId}`).then(res => {
      if (!res.ok) throw new Error('Failed to fetch user profile')
      return res.json()
    }),
    {
      retry: 2,
      onError: (error) => {
        console.error('Error fetching user profile:', error)
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar o perfil do usuário',
          variant: 'destructive',
        })
      },
    }
  )
}

// Exemplo 9: Infinite query para feed de atividades
export function useActivityFeed() {
  return useInfiniteQuery(
    queryKeys.dashboard.activity('recent'),
    (pageParam = 1) =>
      fetch(`/api/activities?page=${pageParam}&limit=20`)
        .then(res => res.json()),
    {
      initialPageParam: 1,
      enabled: true,
    }
  )
}

// Exemplo 10: Múltiplas queries em paralelo
export function useDashboardData() {
  const projects = useOptimizedQuery(
    queryKeys.projects.lists(),
    () => fetch('/api/projects').then(res => res.json())
  )

  const tasks = useOptimizedQuery(
    queryKeys.tasks.lists(),
    () => fetch('/api/tasks').then(res => res.json())
  )

  const notifications = useOptimizedQuery(
    queryKeys.notifications.lists(),
    () => fetch('/api/notifications').then(res => res.json())
  )

  return {
    data: {
      projects: projects.data,
      tasks: tasks.data,
      notifications: notifications.data,
    },
    isLoading: projects.isLoading || tasks.isLoading || notifications.isLoading,
    isError: projects.isError || tasks.isError || notifications.isError,
    error: projects.error || tasks.error || notifications.error,
    refetch: () => {
      projects.refetch()
      tasks.refetch()
      notifications.refetch()
    },
  }
}

// Types de exemplo
interface CreateProjectRequest {
  name: string
  description?: string
  startDate?: string
  endDate?: string
  teamId?: string
}