import React from 'react'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { queryClient } from './config'

// Configuração do persister para localStorage
const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  serialize: (data) => JSON.stringify(data),
  deserialize: (data) => JSON.parse(data),
  key: 'REACT_QUERY_CACHE',
  throttleTime: 1000, // 1 segundo de throttle
})

// Configuração de quais queries devem ser persistidas
const shouldPersistQuery = (query: any) => {
  const [entityType] = query.queryKey

  // NÃO persistir dados sensíveis ou em tempo real
  const nonPersistableTypes = [
    'auth', // Dados de autenticação
    'notifications', // Notificações em tempo real
    'search', // Resultados de busca
    'timer', // Dados de timer
    'activity', // Atividades recentes
  ]

  // NÃO persistir queries com parâmetros específicos
  const hasNonPersistableParam = query.queryKey.some(
    (key: any) =>
      typeof key === 'object' &&
      key &&
      (key.noCache || key.temporary || key.sensitive)
  )

  return !nonPersistableTypes.includes(entityType) && !hasNonPersistableParam
}

// Opções de persistência
const persistOptions = {
  persister,
  maxAge: 1000 * 60 * 60 * 24, // 24 horas
  buster: '', // Pode ser usado para invalidar cache em atualizações
  hydrateOptions: {
    defaultOptions: {
      queries: {
        // Manter dados stale por 5 minutos após hidratação
        staleTime: 1000 * 60 * 5,
      },
    },
  },
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      // Só desidratar queries que devem ser persistidas
      return shouldPersistQuery(query) && query.state.status === 'success'
    },
    shouldDehydrateMutation: () => false, // Não persistir mutations
  },
}

// Componente Provider com persistência
export const ReactQueryPersistProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={() => {
        // Opcional: executar algo quando o cache é restaurado com sucesso
        console.log('React Query cache restored from localStorage')
      }}
      onRestoredError={(error) => {
        console.error('Error restoring React Query cache:', error)
        // Limpar cache corrompido
        localStorage.removeItem('REACT_QUERY_CACHE')
      }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}

// Utilitários para gerenciamento de persistência
export const persistenceUtils = {
  // Limpar cache persistido
  clearPersistedCache: () => {
    localStorage.removeItem('REACT_QUERY_CACHE')
  },

  // Forçar reidratação do cache
  forceRehydrate: () => {
    const cached = localStorage.getItem('REACT_QUERY_CACHE')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        return parsed
      } catch (error) {
        console.error('Error parsing cached data:', error)
        return null
      }
    }
    return null
  },

  // Verificar tamanho do cache
  getCacheSize: () => {
    const cached = localStorage.getItem('REACT_QUERY_CACHE')
    if (!cached) return 0
    return new Blob([cached]).size
  },

  // Invalidar cache persistido para entidades específicas
  invalidatePersistedCache: (entityType: string) => {
    const cached = localStorage.getItem('REACT_QUERY_CACHE')
    if (!cached) return

    try {
      const parsed = JSON.parse(cached)
      const newCache = {
        ...parsed,
        clientState: {
          ...parsed.clientState,
          queries: parsed.clientState.queries.filter(
            (query: any) => !query.queryKey.includes(entityType)
          ),
        },
      }

      localStorage.setItem('REACT_QUERY_CACHE', JSON.stringify(newCache))
    } catch (error) {
      console.error('Error invalidating persisted cache:', error)
    }
  },

  // Habilitar/desabilitar persistência (útil para desenvolvimento)
  togglePersistence: (enabled: boolean) => {
    if (!enabled) {
      localStorage.removeItem('REACT_QUERY_CACHE')
    }
  },
}

// Exportar para uso no app
export { persister }