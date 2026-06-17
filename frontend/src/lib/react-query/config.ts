import { QueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/use-toast'

// Estratégias de cache por tipo de dado
export const CACHE_STRATEGIES = {
  // Dados estáticos - mudam raramente
  STATIC: {
    staleTime: 1000 * 60 * 60, // 1 hora
    gcTime: 1000 * 60 * 60 * 2, // 2 horas
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  // Dados de projetos - mudam moderadamente
  PROJECT: {
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  // Dados de tarefas - mudam frequentemente
  TASK: {
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  // Dados em tempo real - sempre atualizados
  REALTIME: {
    staleTime: 0, // Sempre fresh
    gcTime: 1000 * 60 * 5, // 5 minutos
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 1000 * 30, // 30 segundos
  },

  // Dados de usuário - balanceado
  USER: {
    staleTime: 1000 * 60 * 10, // 10 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
} as const

// Função para determinar estratégia baseada na query key
export const getCacheStrategy = (queryKey: unknown[]) => {
  const [entityType] = queryKey as string[]

  switch (entityType) {
    case 'users':
    case 'teams':
    case 'roles':
    case 'occupations':
      return CACHE_STRATEGIES.STATIC

    case 'projects':
    case 'project':
      return CACHE_STRATEGIES.PROJECT

    case 'tasks':
    case 'task':
      return CACHE_STRATEGIES.TASK

    case 'notifications':
      return CACHE_STRATEGIES.REALTIME

    case 'currentUser':
    case 'profile':
      return CACHE_STRATEGIES.USER

    default:
      return CACHE_STRATEGIES.PROJECT // Estratégia padrão
  }
}

// Configuração do QueryClient otimizada
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Desabilitar refetch automático para melhor performance
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,

      // Retry com exponential backoff
      retry: (failureCount, error: any) => {
        // Não retry para erros 4xx
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false
        }
        // Max 3 retries
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Configurações padrão
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 30, // 30 minutos

      // Aplicar estratégia de cache dinamicamente
      queryFn: async ({ queryKey, signal }) => {
        const strategy = getCacheStrategy(queryKey)
        // Aqui o queryFn real será definido nos hooks individuais
        return Promise.resolve()
      },
    },

    mutations: {
      // Retry mais agressivo para mutations
      retry: (failureCount, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false
        }
        return failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 1.5 ** attemptIndex, 10000),

      // Tratamento de erro global
      onError: (error: any) => {
        console.error('Mutation error:', error)

        // Exibir toast para erros conhecidos
        if (error?.response?.data?.message) {
          toast({
            title: 'Erro',
            description: error.response.data.message,
            variant: 'destructive',
          })
        } else if (error?.message) {
          toast({
            title: 'Erro',
            description: error.message,
            variant: 'destructive',
          })
        }
      },
    },
  },
})

// Utilitários para manipulação de cache
export const cacheUtils = {
  // Invalidar queries relacionadas a uma entidade
  invalidateEntity: (entityType: string, id?: string) => {
    const queriesToInvalidate = [`[${entityType}]`]

    if (id) {
      queriesToInvalidate.push(`["${entityType}","${id}"]`)
    }

    // Adicionar queries relacionadas
    const relatedQueries: Record<string, string[]> = {
      tasks: ['projectTasks', 'taskComments'],
      projects: ['projectTasks', 'project'],
      users: ['currentUser', 'profile'],
    }

    if (relatedQueries[entityType]) {
      queriesToInvalidate.push(...relatedQueries[entityType].map(q => `[${q}]`))
    }

    queriesToInvalidate.forEach(queryPattern => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const keyStr = JSON.stringify(query.queryKey)
          return keyStr.startsWith(queryPattern)
        },
      })
    })
  },

  // Prefetchar dados
  prefetchData: async (
    queryKey: unknown[],
    queryFn: () => Promise<any>,
    options = {}
  ) => {
    const strategy = getCacheStrategy(queryKey)

    await queryClient.prefetchQuery({
      queryKey,
      queryFn,
      ...strategy,
      ...options,
    })
  },

  // Definir dados manualmente no cache
  setQueryData: (queryKey: unknown[], data: any, options = {}) => {
    const strategy = getCacheStrategy(queryKey)

    queryClient.setQueryData(queryKey, data)

    // Opcionalmente, atualizar o tempo de stale
    if (options.updateStaleTime !== false) {
      queryClient.setQueryDefaults(queryKey, {
        staleTime: strategy.staleTime,
      })
    }
  },

  // Limpar cache seletivo
  clearCache: (entityType?: string) => {
    if (entityType) {
      queryClient.removeQueries({
        predicate: (query) => {
          const [key] = query.queryKey as string[]
          return key === entityType
        },
      })
    } else {
      queryClient.clear()
    }
  },
}

// Exportar configuração para uso no app
export const createQueryClient = () => queryClient