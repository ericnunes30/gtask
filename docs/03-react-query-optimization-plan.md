# ⚡ Plano de Otimização: React Query Configuration

## 📋 Visão Geral
Otimização completa da configuração do React Query para reduzir drasticamente o número de requisições HTTP e melhorar a percepção de performance através de cache inteligente.

## 📊 Análise da Codebase

### Configuração Atual
```typescript
// main.tsx - Configuração padrão (sem otimizações)
const queryClient = new QueryClient()
```

### Problemas Identificados

1. **Sem cache estratégico**: Todos os dados ficam stale imediatamente
2. **Refetchs excessivos**: Refetch em window focus, mount, reconnect
3. **Múltiplos refetches simultâneos**: Padrão identificado em Tasks.tsx
4. **Query keys inconsistentes**: Sem padrão definido
5. **Sem tratamento granular de erros**: Retry padrão para todos os casos
6. **Falta de otimizações**: Sem prefetching, optimistic updates, cache persistente

## 🎯 Objetivos

1. **Reduzir requisições HTTP em 40-60%**
2. **Implementar cache estratégico** por tipo de dado
3. **Melhorar percepção de performance** em 70%
4. **Padronizar query keys** em toda a aplicação
5. **Implementar otimizações avançadas** (prefetching, optimistic updates)

## 🛠️ Plano de Implementação

### Fase 1: Configuração Base do QueryClient (Dia 1)

#### 1.1 Configuração Otimizada
```typescript
// frontend/src/config/reactQuery.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados ficam fresh por 5 minutos
      staleTime: 1000 * 60 * 5, // 5 minutos

      // Cache mantido por 30 minutos
      cacheTime: 1000 * 60 * 30, // 30 minutos

      // Não refetch quando janela ganha foco
      refetchOnWindowFocus: false,

      // Não refetch quando componente remonta
      refetchOnMount: false,

      // Refetch quando reconectar (útil)
      refetchOnReconnect: true,

      // Retry mais inteligente
      retry: (failureCount, error) => {
        // Não retry em erros 401/403/404
        if ([401, 403, 404].includes(error?.status)) {
          return false
        }
        // Max 3 retries
        return failureCount < 3
      },

      // Delay entre retries (exponential backoff)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Habilitar logging em desenvolvimento
      queryClientLogger: process.env.NODE_ENV === 'development',
    },
    mutations: {
      // Não retry mutations por padrão
      retry: false,

      // Retry mais rápido para mutations
      retryDelay: 1000,
    },
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: console.error,
  },
})
```

#### 1.2 Constantes para Tipos de Dados
```typescript
// frontend/src/constants/queryConstants.ts
export const QUERY_STALE_TIMES = {
  // Dados que mudam raramente
  STATIC: 1000 * 60 * 60, // 1 hora

  // Dados de usuário
  USER_PROFILE: 1000 * 60 * 15, // 15 minutos

  // Dados de projeto
  PROJECTS: 1000 * 60 * 5, // 5 minutos

  // Dados de tarefas
  TASKS: 1000 * 60 * 2, // 2 minutos

  // Dados em tempo real
  REAL_TIME: 0, // Sempre fresh
} as const

export const QUERY_CACHE_TIMES = {
  // Cache persistente por tempo prolongado
  STATIC: 1000 * 60 * 60 * 24, // 24 horas

  // Cache médio
  DEFAULT: 1000 * 60 * 30, // 30 minutos

  // Cache curto para dados voláteis
  VOLATILE: 1000 * 60 * 5, // 5 minutos
} as const
```

### Fase 2: Padrões de Query Keys (Dia 1-2)

#### 2.1 Definir Padrão de Query Keys
```typescript
// frontend/src/constants/queryKeys.ts
export const queryKeys = {
  // Autenticação
  auth: {
    root: ['auth'] as const,
    profile: () => [...queryKeys.auth.root, 'profile'] as const,
    session: () => [...queryKeys.auth.root, 'session'] as const,
  },

  // Usuários
  users: {
    root: ['users'] as const,
    list: (filters?: UserFilters) => [...queryKeys.users.root, 'list', filters] as const,
    detail: (id: number) => [...queryKeys.users.root, 'detail', id] as const,
    projects: (userId: number) => [...queryKeys.users.detail(userId), 'projects'] as const,
  },

  // Projetos
  projects: {
    root: ['projects'] as const,
    list: (filters?: ProjectFilters) => [...queryKeys.projects.root, 'list', filters] as const,
    detail: (id: number) => [...queryKeys.projects.root, 'detail', id] as const,
    tasks: (projectId: number) => [...queryKeys.projects.detail(projectId), 'tasks'] as const,
    users: (projectId: number) => [...queryKeys.projects.detail(projectId), 'users'] as const,
    statistics: (projectId: number) => [...queryKeys.projects.detail(projectId), 'statistics'] as const,
  },

  // Tarefas
  tasks: {
    root: ['tasks'] as const,
    list: (filters?: TaskFilters) => [...queryKeys.tasks.root, 'list', filters] as const,
    detail: (id: number) => [...queryKeys.tasks.root, 'detail', id] as const,
    comments: (taskId: number) => [...queryKeys.tasks.detail(taskId), 'comments'] as const,
    activities: (taskId: number) => [...queryKeys.tasks.detail(taskId), 'activities'] as const,
  },

  // Notificações
  notifications: {
    root: ['notifications'] as const,
    list: (filters?: NotificationFilters) => [...queryKeys.notifications.root, 'list', filters] as const,
    unread: () => [...queryKeys.notifications.root, 'unread'] as const,
    count: () => [...queryKeys.notifications.root, 'count'] as const,
  },

  // Times
  teams: {
    root: ['teams'] as const,
    list: (filters?: TeamFilters) => [...queryKeys.teams.root, 'list', filters] as const,
    detail: (id: number) => [...queryKeys.teams.root, 'detail', id] as const,
    members: (teamId: number) => [...queryKeys.teams.detail(teamId), 'members'] as const,
  },
} as const
```

#### 2.2 Criar Hooks Configuráveis
```typescript
// frontend/src/hooks/useOptimizedQuery.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { QUERY_STALE_TIMES } from '@/constants/queryConstants'

export const useOptimizedQuery = <
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[]
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
    dataType?: keyof typeof QUERY_STALE_TIMES
  }
) => {
  const { dataType = 'DEFAULT', ...queryOptions } = options

  return useQuery({
    staleTime: QUERY_STALE_TIMES[dataType],
    ...queryOptions,
  })
}
```

### Fase 3: Estratégias por Tipo de Dado (Dia 2-3)

#### 3.1 Dados Estáticos (Raramente mudam)
```typescript
// frontend/src/hooks/queries/useStaticData.ts
export const useUsers = (filters?: UserFilters) => {
  return useOptimizedQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => userService.getUsers(filters),
    dataType: 'STATIC',
    placeholderData: keepPreviousData,
  })
}

export const useUser = (id: number) => {
  return useOptimizedQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => userService.getUserById(id),
    dataType: 'STATIC',
    enabled: !!id,
  })
}
```

#### 3.2 Dados de Projeto (Mudam com frequência moderada)
```typescript
// frontend/src/hooks/queries/useProjects.ts
export const useProjects = (filters?: ProjectFilters) => {
  return useOptimizedQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: () => projectService.getProjects(filters),
    dataType: 'PROJECTS',
    placeholderData: keepPreviousData,
  })
}

export const useProject = (id: number) => {
  return useOptimizedQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => projectService.getProjectById(id),
    dataType: 'PROJECTS',
    enabled: !!id,
  })
}
```

#### 3.3 Dados em Tempo Real (Notificações)
```typescript
// frontend/src/hooks/queries/useNotifications.ts
export const useNotifications = (filters?: NotificationFilters) => {
  return useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: () => notificationService.getNotifications(filters),
    staleTime: 0, // Sempre fresh
    refetchInterval: 1000 * 30, // Refetch a cada 30 segundos
    placeholderData: keepPreviousData,
  })
}

export const useUnreadNotifications = () => {
  return useQuery({
    queryKey: queryKeys.notifications.unread(),
    queryFn: () => notificationService.getUnreadCount(),
    staleTime: 0,
    refetchInterval: 1000 * 15, // Refetch mais frequente
  })
}
```

### Fase 4: Otimizações Avançadas (Dia 3-4)

#### 4.1 Prefetching
```typescript
// frontend/src/hooks/usePrefetch.ts
export const usePrefetch = () => {
  const queryClient = useQueryClient()

  const prefetchProject = (projectId: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.projects.detail(projectId),
      queryFn: () => projectService.getProjectById(projectId),
      staleTime: QUERY_STALE_TIMES.PROJECTS,
    })
  }

  const prefetchTask = (taskId: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.tasks.detail(taskId),
      queryFn: () => taskService.getTaskById(taskId),
      staleTime: QUERY_STALE_TIMES.TASKS,
    })
  }

  return { prefetchProject, prefetchTask }
}

// Uso em componentes
const ProjectCard = ({ project }) => {
  const { prefetchProject } = usePrefetch()

  return (
    <div
      onMouseEnter={() => prefetchProject(project.id)}
    >
      {/* Card content */}
    </div>
  )
}
```

#### 4.2 Optimistic Updates
```typescript
// frontend/src/hooks/mutations/useUpdateTask.ts
export const useUpdateTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateTaskData) => taskService.updateTask(data),

    // Update otimista
    onMutate: async (newTask) => {
      // Cancel queries outgoing
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.list() })

      // Snapshot do valor anterior
      const previousTasks = queryClient.getQueryData(queryKeys.tasks.list())

      // Update otimista
      queryClient.setQueryData(queryTasks.list(), (old) =>
        old?.map(task => task.id === newTask.id ? { ...task, ...newTask } : task)
      )

      return { previousTasks }
    },

    // Rollback em caso de erro
    onError: (err, newTask, context) => {
      queryClient.setQueryData(queryKeys.tasks.list(), context.previousTasks)
    },

    // Refetch em caso de sucesso
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list() })
    },
  })
}
```

#### 4.3 Invalidação Seletiva
```typescript
// frontend/src/utils/queryInvalidation.ts
export const invalidateQueries = {
  // Invalidar queries relacionadas a usuário
  user: (userId: number) => {
    const queryClient = useQueryClient()
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.users.projects(userId) }),
    ])
  },

  // Invalidar queries relacionadas a projeto
  project: (projectId: number) => {
    const queryClient = useQueryClient()
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.tasks(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.users(projectId) }),
    ])
  },

  // Invalidar queries relacionadas a tarefa
  task: (taskId: number) => {
    const queryClient = useQueryClient()
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.comments(taskId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.activities(taskId) }),
    ])
  },
}
```

### Fase 5: Implementação de Cache Persistente (Dia 4)

#### 5.1 Configurar Persistência
```typescript
// frontend/src/config/queryPersistence.ts
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

export const setupQueryPersistence = (queryClient: QueryClient) => {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
  })

  persistQueryClient({
    queryClient,
    persister,
    maxAge: 1000 * 60 * 60 * 24, // 24 horas
    buster: '', // Version string
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        // Não persistir queries em tempo real
        const queryKey = query.queryKey
        return !(
          queryKey[0] === 'notifications' ||
          queryKey[0] === 'socket' ||
          query.state.status === 'error'
        )
      },
    },
  })
}
```

### Fase 6: Refatoração de Queries Existentes (Dia 5)

#### 6.1 Padronizar Queries no App
```typescript
// Exemplo de refatoração em Tasks.tsx

// Antes:
const { data: tasks, refetch } = useQuery({
  queryKey: ['tasks'],
  queryFn: fetchTasks,
})

// Múltiplos refetches:
await refetch()
await refetch()
await refetch()

// Depois:
const { data: tasks } = useOptimizedQuery({
  queryKey: queryKeys.tasks.list(filters),
  queryFn: () => taskService.getTasks(filters),
  dataType: 'TASKS',
})

// Update otimista ao invés de refetch:
queryClient.setQueryData(queryKeys.tasks.list(), updatedTasks)
```

## 📅 Cronograma

| Fase | Tarefas | Duração | Status |
|------|---------|---------|--------|
| 1 | Configuração base do QueryClient | 1 dia | ⏳ |
| 2 | Padrões de query keys | 2 dias | ⏳ |
| 3 | Estratégias por tipo de dado | 2 dias | ⏳ |
| 4 | Otimizações avançadas | 2 dias | ⏳ |
| 5 | Cache persistente | 1 dia | ⏳ |
| 6 | Refatoração de queries | 1 dia | ⏳ |
| 7 | Testes e validação | 1 dia | ⏳ |

## 🔧 Dependências

```bash
npm install @tanstack/react-query-persist-client @tanstack/query-sync-storage-persister
```

## ⚠️ Armadilhas e Soluções

### 1. Problema: Cache Stale
**Solução**: Implementar background refetch para dados críticos

### 2. Problema: Memória Excessiva
**Solução**: Limpar cache de queries não usadas com gcTime

### 3. Problema: Dados Inconsistentes
**Solução**: Implementar estratégias de invalidação precisas

### 4. Problema: Performance em Dispositivos Móveis
**Solução**: Ajustar estratégias baseado em network conditions

## 📈 Métricas de Sucesso

1. **Redução de requisições HTTP**: 40-60%
2. **Cache hit rate**: > 80%
3. **Tempo de carregamento percebido**: Redução de 70%
4. **Uso de dados móveis**: Redução de 30-50%

---

**Status**: Pronto para implementação
**Prioridade**: Alta
**Estimativa de esforço**: 7-8 dias
**Impacto esperado**: Alto (redução drástica de requisições e melhoria de performance)