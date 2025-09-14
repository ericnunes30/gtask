# 🔄 Plano de Migração: Context API → Zustand

## 📋 Visão Geral
Migração completa dos 4 contextos atuais para Zustand, eliminando o problema de re-renderizações em cascata e melhorando significativamente a performance da UI.

## 📊 Análise da Codebase

### Contextos Atuais Identificados

| Contexto | Arquivo | Estados | Funções | Complexidade |
|---------|---------|---------|---------|--------------|
| AuthContext | `contexts/AuthContext.tsx` | 5 estados | 3 funções | Alta |
| SocketContext | `contexts/SocketContext.tsx` | 2 estados | 0 funções | Média |
| NotificationContext | `contexts/NotificationContext.tsx` | 4 estados | 4 funções | Alta |
| TaskModalContext | `contexts/TaskModalContext.tsx` | 2 estados | 2 funções | Baixa |

### Problemas Atuais

1. **Re-renderização em cascata**: Qualquer mudança em qualquer contexto causa re-render de toda a árvore
2. **Aninhamento excessivo**: 4 levels de providers no App.tsx
3. **Dificuldade de otimização**: React.memo ineficaz devido à natureza do Context
4. **Props drilling implícito**: Contextos acessam outros contextos internamente

## 🎯 Objetivos

1. **Eliminar re-renderizações desnecessárias**
2. **Simplificar a árvore de componentes** (remover providers)
3. **Melhorar performance da UI** em 40-60%
4. **Facilitar manutenção** do estado global
5. **Melhorar experiência de desenvolvimento**

## 🛠️ Plano de Implementação

### Fase 0: Preparação (Dia 1)

#### 0.1 Instalação de Dependências
```bash
npm install zustand zustand/middleware
```

#### 0.2 Análise de Impacto
- Mapear todos os componentes que usam cada contexto
- Identificar dependências entre contextos
- Preparar estratégia de rollback

### Fase 1: Criação das Stores (Dias 1-2)

#### 1.1 AuthStore - Estado de Autenticação
```typescript
// frontend/src/stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/common/types'

interface AuthState {
  // Estado
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  isAuthenticated: boolean

  // Ações
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshAuthToken: () => Promise<boolean>
  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Implementação completa no arquivo final
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken
      })
    }
  )
)
```

#### 1.2 SocketStore - Conexão WebSocket
```typescript
// frontend/src/stores/socketStore.ts
import { create } from 'zustand'
import { Socket } from 'socket.io-client'

interface SocketState {
  socket: Socket | null
  isConnected: boolean

  // Ações
  setConnected: (connected: boolean) => void
  initializeSocket: () => void
  disconnectSocket: () => void
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  setConnected: (isConnected) => set({ isConnected }),

  initializeSocket: () => {
    // Lógica de inicialização
  },

  disconnectSocket: () => {
    // Lógica de desconexão
  }
}))
```

#### 1.3 NotificationStore - Notificações
```typescript
// frontend/src/stores/notificationStore.ts
import { create } from 'zustand'

interface Notification {
  id: string
  type: string
  message: string
  data: any
  createdAt: string
  readAt?: string
}

interface NotificationState {
  // Estado
  notifications: Notification[]
  unreadCount: number
  page: number
  hasNext: boolean

  // Ações
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  loadMore: () => Promise<void>
  addNotification: (notification: Notification) => void
  setNotifications: (notifications: Notification[]) => void
  fetchNotifications: (opts?: { append?: boolean; page?: number }) => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  page: 1,
  hasNext: false,

  // Implementação das ações
}))
```

#### 1.4 TaskModalStore - Modal de Tarefas
```typescript
// frontend/src/stores/taskModalStore.ts
import { create } from 'zustand'

interface TaskModalState {
  isOpen: boolean
  taskId: number | null

  // Ações
  openTask: (taskId: number) => void
  close: () => void
}

export const useTaskModalStore = create<TaskModalState>((set) => ({
  isOpen: false,
  taskId: null,

  openTask: (taskId) => set({ isOpen: true, taskId }),
  close: () => set({ isOpen: false, taskId: null })
}))
```

### Fase 2: Migração Gradual (Dias 2-4)

#### 2.1 Estratégia de Migração
**Ordem recomendada:**
1. **TaskModalContext** (mais simples)
2. **SocketContext** (dependência do Notification)
3. **NotificationContext** (mais complexo)
4. **AuthContext** (crítico)

#### 2.2 Criar Adaptadores para Compatibilidade
```typescript
// frontend/src/contexts/adapters/AuthContextAdapter.tsx
import { useAuthStore } from '@/stores/authStore'

export const useAuth = () => {
  const {
    user,
    accessToken,
    refreshToken,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshAuthToken
  } = useAuthStore()

  // Manter mesma API para compatibilidade
  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshAuthToken
  }
}
```

#### 2.3 Processo de Migração por Contexto

**Para cada contexto:**
1. Criar a store correspondente
2. Criar adapter com mesma API
3. Atualizar imports nos componentes
4. Testar funcionamento
5. Remover context antigo
6. Atualizar componentes para usar store diretamente

### Fase 3: Integração e Hooks (Dias 4-5)

#### 3.1 Hook para Eventos de Socket
```typescript
// frontend/src/hooks/useSocketEvents.ts
export const useSocketEvents = () => {
  const { socket } = useSocketStore()
  const addNotification = useNotificationStore.getState().addNotification

  useEffect(() => {
    if (!socket) return

    // Configurar event listeners
    const handleConnect = () => {
      useSocketStore.getState().setConnected(true)
    }

    socket.on('connect', handleConnect)

    return () => {
      socket.off('connect', handleConnect)
    }
  }, [socket])
}
```

#### 3.2 Hook para Integração com WebSocket
```typescript
// frontend/src/hooks/useNotificationEvents.ts
export const useNotificationEvents = () => {
  const { socket } = useSocketStore()
  const addNotification = useNotificationStore.getState().addNotification

  useEffect(() => {
    if (!socket) return

    socket.on('notification', (notification) => {
      addNotification(notification)
      toast.info('Nova notificação')
    })

    return () => {
      socket.off('notification')
    }
  }, [socket, addNotification])
}
```

### Fase 4: Remoção dos Providers (Dia 5)

#### 4.1 Simplificar App.tsx
```typescript
// Antes:
<AuthProvider>
  <SocketProvider>
    <NotificationProvider>
      <TaskModalProvider>
        <AppRoutes />

// Depois:
<AppRoutes /> // Nada de providers!
```

#### 4.2 Atualizar Componentes para Usar Stores Diretamente
```typescript
// Antes:
import { useAuth } from '@/contexts/AuthContext'

// Depois:
import { useAuthStore } from '@/stores/authStore'
// ou usar o adapter durante transição
import { useAuth } from '@/contexts/adapters/AuthContextAdapter'
```

### Fase 5: Otimizações Adicionais (Dia 5-6)

#### 5.1 Implementar Middleware de Logging
```typescript
// frontend/src/middleware/logger.ts
export const logger = (config) => (set, get, api) =>
  config(
    (...args) => {
      console.log('  applying', args)
      set(...args)
      console.log('  new state', get())
    },
    get,
    api
  )
```

#### 5.2 Adicionar DevTools
```typescript
// Em cada store
import { devtools, persist } from 'zustand/middleware'

export const useStore = create()(devtools(...), persist(...))
```

#### 5.3 Implementar Seletores Otimizados
```typescript
// Em componentes, usar seletores específicos
const user = useAuthStore((state) => state.user)
const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
```

## 📅 Cronograma Detalhado

| Tarefa | Duração | Responsável | Dependencies | Status |
|--------|---------|-------------|--------------|--------|
| Instalação e Setup | 4 horas | Frontend | - | ⏳ |
| Criar AuthStore | 6 horas | Frontend | - | ⏳ |
| Criar SocketStore | 4 horas | Frontend | AuthStore | ⏳ |
| Criar NotificationStore | 8 horas | Frontend | SocketStore | ⏳ |
| Criar TaskModalStore | 2 horas | Frontend | - | ⏳ |
| Migrar TaskModalContext | 4 horas | Frontend | TaskModalStore | ⏳ |
| Migrar SocketContext | 4 horas | Frontend | SocketStore | ⏳ |
| Migrar NotificationContext | 6 horas | Frontend | NotificationStore | ⏳ |
| Migrar AuthContext | 8 horas | Frontend | AuthStore | ⏳ |
| Remover Providers | 4 horas | Frontend | Todas stores | ⏳ |
| Testes e Validação | 8 horas | QA/Frontend | Tudo migrado | ⏳ |
| Otimizações Finais | 4 horas | Frontend | Migração completa | ⏳ |

## 🔧 Dependências Técnicas

### Pacotes Necessários
```json
{
  "dependencies": {
    "zustand": "^4.4.0",
    "zustand/middleware": "^4.4.0"
  }
}
```

### Estrutura de Arquivos
```
frontend/src/
├── stores/
│   ├── authStore.ts
│   ├── socketStore.ts
│   ├── notificationStore.ts
│   └── taskModalStore.ts
├── contexts/adapters/
│   ├── AuthContextAdapter.tsx
│   ├── SocketContextAdapter.tsx
│   ├── NotificationContextAdapter.tsx
│   └── TaskModalContextAdapter.tsx
├── hooks/
│   ├── useSocketEvents.ts
│   └── useNotificationEvents.ts
└── middleware/
    └── logger.ts
```

## ⚠️ Riscos e Mitigação

### 1. Risco: Breaking Changes
**Mitigação:**
- Usar adapters durante transição
- Testes exhaustivos
- Rollback rápido disponível

### 2. Risco: Perda de Funcionalidade
**Mitigação:**
- Manter todos os efeitos colaterais
- Testar cada fluxo de usuário
- Documentar todas as mudanças

### 3. Risco: Performance Regressão
**Mitigação:**
- Medir performance antes e depois
- Usar React Profiler
- Testar em dispositivos de baixa performance

### 4. Risco: Complexidade de Debug
**Mitigação:**
- Configurar DevTools
- Adicionar logging adequado
- Documentar padrões de uso

## 📈 Métricas de Sucesso

### Métricas Técnicas
1. **Redução de re-renders**: Medir com React DevTools
2. **Tamanho do bundle**: Redução esperada de 5-10%
3. **Tempo de montagem**: Redução de 20-30%
4. **Uso de memória**: Redução de 15-20%

### Métricas de Negócio
1. **Tempo de resposta da UI**: Melhoria de 40-60%
2. **Taxa de erros**: Manter ou reduzir
3. **Satisfação do usuário**: Aumentar NPS

## 🔄 Pós-Implementação

### 1. Monitoramento
- Configurar analytics para performance
- Monitorar erros relacionados a estado
- Acompanhar métricas de uso

### 2. Documentação
- Atualizar arquitetura do sistema
- Documentar padrões de uso das stores
- Criar guia de boas práticas

### 3. Treinamento
- Apresentar novo padrão ao time
- Compartilhar boas práticas
- Q&A session

### 4. Próximos Passos
- Migrar outros estados locais para stores
- Implementar middleware adicional
- Otimizar integração com React Query

---

**Status**: Pronto para implementação
**Prioridade**: Alta
**Estimativa de esforço**: 6 dias
**Impacto esperado**: Muito Alto (melhoria dramática na performance e developer experience)