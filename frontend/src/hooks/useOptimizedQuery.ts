import React from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/react-query/keys'
import { cacheUtils, getCacheStrategy } from '@/lib/react-query/config'
import { useCallback } from 'react'

// Hook para queries otimizadas com estratégias de cache
export function useOptimizedQuery<T>(
  key: readonly unknown[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, 'queryKey' | 'queryFn'>
) {
  const strategy = getCacheStrategy(key)

  return useQuery({
    queryKey: key,
    queryFn,
    ...strategy,
    ...options,
    // Mesclar estratégias com opções personalizadas
    staleTime: options?.staleTime ?? strategy.staleTime,
    gcTime: options?.gcTime ?? strategy.gcTime,
    refetchOnMount: options?.refetchOnMount ?? strategy.refetchOnMount,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? strategy.refetchOnWindowFocus,
    refetchOnReconnect: options?.refetchOnReconnect ?? strategy.refetchOnReconnect,
  })
}

// Hook para mutations com optimistic updates
export function useOptimisticMutation<TData, TVariables, TContext = unknown>(
  options: UseMutationOptions<TData, Error, TVariables, TContext> & {
    // Função para atualizar o cache optimisticamente
    onMutate?: (variables: TVariables) => Promise<TContext> | TContext
    // Queries para invalidar em caso de sucesso (pode ser array ou função que retorna array)
    invalidateKeys?: readonly unknown[][] | ((data: TData, variables: TVariables, context?: TContext) => readonly unknown[][])
    // Função para atualizar dados no cache após sucesso
    updateCache?: (data: TData, variables: TVariables) => void
  }
): UseMutationResult<TData, Error, TVariables, TContext> {
  const queryClient = useQueryClient()

  return useMutation({
    ...options,
    onMutate: async (variables) => {
      // Cancelar queries relacionadas
      if (options.invalidateKeys) {
        const keysToInvalidate = Array.isArray(options.invalidateKeys) 
          ? options.invalidateKeys 
          : [];
        keysToInvalidate.forEach(key => {
          queryClient.cancelQueries({ queryKey: key })
        })
      }

// Salvar snapshot do estado anterior
      const keysToInvalidate = Array.isArray(options.invalidateKeys) 
        ? options.invalidateKeys 
        : [];
      const snapshot = keysToInvalidate.reduce((acc, key) => {
        acc[key.join('.')] = queryClient.getQueryData(key)
        return acc
      }, {} as Record<string, any>)

      // Executar onMutate customizado se fornecido
      let context: TContext | undefined
      if (options.onMutate) {
        context = await options.onMutate(variables)
      }

      return { snapshot, ...context } as TContext & { snapshot?: Record<string, any> }
    },

    onError: (err, variables, context) => {
      // Reverter para o snapshot em caso de erro
      if (context?.snapshot) {
        Object.entries(context.snapshot).forEach(([key, data]) => {
          const queryKey = key.split('.')
          queryClient.setQueryData(queryKey, data)
        })
      }

      // Chamar onError original se fornecido
      if (options.onError) {
        options.onError(err, variables, context)
      }
    },

onSettled: (data, error, variables, context) => {
      // Invalidar queries relacionadas
      if (options.invalidateKeys) {
        const keysToInvalidate = Array.isArray(options.invalidateKeys) 
          ? options.invalidateKeys 
          : (typeof options.invalidateKeys === 'function' && data 
             ? options.invalidateKeys(data, variables, context as TContext) 
             : []);
        keysToInvalidate.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key })
        })
      }

      // Atualizar cache com novos dados se fornecido
      if (data && options.updateCache) {
        options.updateCache(data, variables)
      }

      // Chamar onSettled original se fornecido
      if (options.onSettled) {
        options.onSettled(data, error, variables, context)
      }
    },
  })
}

// Hook para prefetching de dados
export function usePrefetch() {
  const queryClient = useQueryClient()

  const prefetch = useCallback(
    async <T>(
      key: readonly unknown[],
      queryFn: () => Promise<T>,
      options?: { staleTime?: number; gcTime?: number }
    ) => {
      await cacheUtils.prefetchData(key, queryFn, options)
    },
    [queryClient]
  )

  return { prefetch }
}

// Hook para gerenciar cache manualmente
export function useCacheManager() {
  const queryClient = useQueryClient()

  return {
    // Definir dados no cache
    setData: useCallback(
      <T>(key: readonly unknown[], data: T, options?: { updateStaleTime?: boolean }) => {
        cacheUtils.setQueryData(key, data, options)
      },
      [queryClient]
    ),

    // Remover dados do cache
    removeData: useCallback(
      (key: readonly unknown[]) => {
        queryClient.removeQueries({ queryKey: key })
      },
      [queryClient]
    ),

    // Invalidar queries
    invalidate: useCallback(
      (key: readonly unknown[], options?: { exact?: boolean }) => {
        queryClient.invalidateQueries({ queryKey: key, exact: options?.exact })
      },
      [queryClient]
    ),

    // Limpar cache
    clear: useCallback(() => {
      queryClient.clear()
    }, [queryClient]),

    // Verificar se dados estão no cache
    hasData: useCallback(
      (key: readonly unknown[]) => {
        return queryClient.getQueryData(key) !== undefined
      },
      [queryClient]
    ),

    // Obter dados do cache
    getData: useCallback(
      <T>(key: readonly unknown[]): T | undefined => {
        return queryClient.getQueryData<T>(key)
      },
      [queryClient]
    ),
  }
}

// Hook para queries dependentes
export function useDependentQuery<T>(
  key: readonly unknown[],
  queryFn: () => Promise<T>,
  dependencies: readonly unknown[],
  options?: Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const enabled = dependencies.every(dep => dep !== undefined && dep !== null)

  return useOptimizedQuery(key, queryFn, {
    ...options,
    enabled: enabled && (options?.enabled ?? true),
  })
}

// Hook para queries em tempo real com polling
export function useRealtimeQuery<T>(
  key: readonly unknown[],
  queryFn: () => Promise<T>,
  options?: {
    interval?: number
    enabled?: boolean
    stopWhen?: (data: T) => boolean
  }
) {
  const strategy = getCacheStrategy(key)
  const refetchInterval = options?.interval ?? strategy.refetchInterval

  return useOptimizedQuery(key, queryFn, {
    refetchInterval,
    refetchIntervalInBackground: false,
    enabled: options?.enabled ?? true,
  })
}

// Hook para paginação otimizada
export function usePaginatedQuery<T>(
  key: readonly unknown[],
  queryFn: (page: number) => Promise<{ data: T[]; total: number; page: number; totalPages: number }>,
  options?: {
    initialPage?: number
    pageSize?: number
    keepPreviousData?: boolean
  }
) {
  const [page, setPage] = React.useState(options?.initialPage ?? 1)

  const { data, isLoading, isError, error } = useOptimizedQuery(
    [...key, page],
    () => queryFn(page),
    {
      keepPreviousData: options?.keepPreviousData ?? true,
    }
  )

  return {
    data: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    currentPage: page,
    isLoading,
    isError,
    error,
    setPage,
    hasNextPage: page < (data?.totalPages ?? 0),
    hasPreviousPage: page > 1,
    nextPage: () => setPage(p => Math.min(p + 1, data?.totalPages ?? 0)),
    previousPage: () => setPage(p => Math.max(p - 1, 1)),
    goToPage: setPage,
  }
}

// Hook para infinite query otimizado
export function useInfiniteQuery<T>(
  key: readonly unknown[],
  queryFn: (pageParam: number) => Promise<{ data: T[]; nextPage: number | null }>,
  options?: {
    initialPageParam?: number
    pageSize?: number
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: key,
    queryFn: ({ pageParam = options?.initialPageParam ?? 1 }) => queryFn(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: options?.enabled ?? true,
    ...getCacheStrategy(key),
  })
}