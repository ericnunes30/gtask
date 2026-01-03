import { usePrefetch } from './useOptimizedQuery'
import { queryKeys } from '@/lib/react-query/keys'
import { useCallback } from 'react'

export const useDataPrefetching = () => {
  const { prefetch } = usePrefetch()

  // Prefetch de projetos
  const prefetchProject = useCallback((projectId: number) => {
    prefetch(
      queryKeys.projects.detail(projectId),
      async () => {
        const response = await fetch(`/api/projects/${projectId}`)
        return response.json()
      },
      { staleTime: 1000 * 60 * 5 } // 5 minutos
    )
  }, [prefetch])

  // Prefetch de tarefas
  const prefetchTask = useCallback((taskId: number) => {
    prefetch(
      queryKeys.tasks.detail(taskId),
      async () => {
        const response = await fetch(`/api/tasks/${taskId}`)
        return response.json()
      },
      { staleTime: 1000 * 60 * 2 } // 2 minutos
    )
  }, [prefetch])

  // Prefetch de usuário
  const prefetchUser = useCallback((userId: number) => {
    prefetch(
      queryKeys.users.detail(userId),
      async () => {
        const response = await fetch(`/api/users/${userId}`)
        return response.json()
      },
      { staleTime: 1000 * 60 * 10 } // 10 minutos
    )
  }, [prefetch])

  // Prefetch de equipe
  const prefetchTeam = useCallback((teamId: number) => {
    prefetch(
      queryKeys.teams.detail(teamId),
      async () => {
        const response = await fetch(`/api/teams/${teamId}`)
        return response.json()
      },
      { staleTime: 1000 * 60 * 15 } // 15 minutos
    )
  }, [prefetch])

  // Prefetch de tarefas por projeto
  const prefetchProjectTasks = useCallback((projectId: number) => {
    prefetch(
      queryKeys.tasks.byProject(projectId),
      async () => {
        const response = await fetch(`/api/tasks?project=${projectId}`)
        return response.json()
      },
      { staleTime: 1000 * 60 * 2 } // 2 minutos
    )
  }, [prefetch])

  // Prefetch de comentários por tarefa
  const prefetchTaskComments = useCallback((taskId: number) => {
    prefetch(
      queryKeys.comments.byTask(taskId),
      async () => {
        const response = await fetch(`/api/comments?taskId=${taskId}`)
        return response.json()
      },
      { staleTime: 1000 * 60 * 1 } // 1 minuto
    )
  }, [prefetch])

  // Prefetch múltiplos recursos para uma página
  const prefetchPageData = useCallback((page: string, id?: number) => {
    switch (page) {
      case 'project':
        if (id) {
          prefetchProject(id)
          prefetchProjectTasks(id)
        }
        break
      case 'task':
        if (id) {
          prefetchTask(id)
          prefetchTaskComments(id)
        }
        break
      case 'user':
        if (id) {
          prefetchUser(id)
        }
        break
      case 'team':
        if (id) {
          prefetchTeam(id)
        }
        break
    }
  }, [prefetchProject, prefetchTask, prefetchUser, prefetchTeam, prefetchProjectTasks, prefetchTaskComments])

  return {
    prefetchProject,
    prefetchTask,
    prefetchUser,
    prefetchTeam,
    prefetchProjectTasks,
    prefetchTaskComments,
    prefetchPageData,
  }
}

// Hook para prefetching no hover
export const useHoverPrefetch = () => {
  const { prefetchPageData } = useDataPrefetching()

  const createHoverHandler = useCallback((
    page: string,
    id?: number,
    delay = 200
  ) => {
    let timeoutId: NodeJS.Timeout

    return {
      onMouseEnter: () => {
        timeoutId = setTimeout(() => {
          prefetchPageData(page, id)
        }, delay)
      },
      onMouseLeave: () => {
        clearTimeout(timeoutId)
      },
      onFocus: () => {
        timeoutId = setTimeout(() => {
          prefetchPageData(page, id)
        }, delay)
      },
      onBlur: () => {
        clearTimeout(timeoutId)
      },
    }
  }, [prefetchPageData])

  return { createHoverHandler }
}