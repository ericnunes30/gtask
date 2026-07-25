import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { User } from '@/utils/commonTypes'
import { toast } from 'sonner'
import { api } from '@/services/backend/api'

// ------------------------------------------------------------------
// Module-level scheduler state (not persisted)
// ------------------------------------------------------------------
let refreshTimer: ReturnType<typeof setTimeout> | null = null
let onTokensRefreshedCallback: (() => void) | null = null

export function setOnTokensRefreshed(callback: (() => void) | null) {
  onTokensRefreshedCallback = callback
}

function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

function decodeJwtExp(token: string): { exp: number; iat?: number } | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded =
      typeof window !== 'undefined'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString('utf-8')
    const parsed = JSON.parse(decoded)
    if (parsed.exp) {
      return { exp: Number(parsed.exp), iat: parsed.iat ? Number(parsed.iat) : undefined }
    }
  } catch {
    // ignore malformed JWTs
  }
  return null
}

function scheduleTokenRefresh(token: string, refreshFn: () => Promise<boolean>) {
  clearRefreshTimer()
  const decoded = decodeJwtExp(token)
  let refreshAt: number

  if (decoded) {
    if (decoded.iat) {
      const lifetimeMs = (decoded.exp - decoded.iat) * 1000
      refreshAt = decoded.iat * 1000 + lifetimeMs * 0.8
    } else {
      // 5 minutes before expiry
      refreshAt = decoded.exp * 1000 - 5 * 60 * 1000
    }
  } else {
    // fixed 5 minutes
    refreshAt = Date.now() + 5 * 60 * 1000
  }

  const delay = Math.max(0, refreshAt - Date.now())
  refreshTimer = setTimeout(() => {
    refreshFn()
  }, delay)
}

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
  initialize: () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => {
        return {
          // Estado inicial
          user: null,
          accessToken: null,
          refreshToken: null,
          isLoading: true,
          isAuthenticated: false,

          // Ações
          login: async (email: string, password: string) => {
            try {
              set({ isLoading: true })

              const response = await api.post('/auth/login', { email, password })
              const data = response.data.data || response.data

              if (!data || !data.accessToken || !data.refreshToken || !data.user) {
                throw new Error('Resposta de autenticação inválida do servidor')
              }

              const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: newUser } = data

              // Atualizar store
              set({
                user: newUser,
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                isAuthenticated: true,
                isLoading: false
              })

              // Atualizar localStorage
              localStorage.setItem('accessToken', newAccessToken)
              localStorage.setItem('refreshToken', newRefreshToken)
              localStorage.setItem('user', JSON.stringify(newUser))

              // Atualizar axios
              api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`

              // Agendar próximo refresh proativo
              scheduleTokenRefresh(newAccessToken, get().refreshAuthToken)
              onTokensRefreshedCallback?.()

              toast.success('Login realizado com sucesso!')
            } catch (error: any) {
              console.error('Erro ao fazer login:', error)
              toast.error(error.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.')
              get().logout()
            }
          },

          logout: () => {
            clearRefreshTimer()
            api.defaults.headers.common['Authorization'] = ''
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false
            })

            // Limpar localStorage
            localStorage.removeItem('user')
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')

            toast.info('Sua sessão expirou. Por favor, faça login novamente.')
          },

          refreshAuthToken: async (): Promise<boolean> => {
            const { refreshToken } = get()

            if (!refreshToken) {
              get().logout()
              return false
            }

            try {
              const response = await api.post('/auth/refresh', { refreshToken })
              const data = response.data.data || response.data

              if (!data || !data.accessToken) {
                throw new Error('Invalid refresh token response')
              }

              const newAccessToken = data.accessToken
              const newRefreshToken = data.refreshToken

              // Atualizar store
              set({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken ?? get().refreshToken,
                isAuthenticated: true
              })

              // Atualizar localStorage
              localStorage.setItem('accessToken', newAccessToken)
              if (newRefreshToken) {
                localStorage.setItem('refreshToken', newRefreshToken)
              }

              // Atualizar axios
              api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`

              // Agendar próximo refresh proativo
              scheduleTokenRefresh(newAccessToken, get().refreshAuthToken)
              onTokensRefreshedCallback?.()

              return true
            } catch (error) {
              console.error('Failed to refresh token', error)
              get().logout()
              return false
            }
          },

          setUser: (user: User | null) => {
            set({ user })
            if (user) {
              localStorage.setItem('user', JSON.stringify(user))
            } else {
              localStorage.removeItem('user')
            }
          },

          setTokens: (accessToken: string, refreshToken: string) => {
            set({
              accessToken,
              refreshToken,
              isAuthenticated: true
            })

            localStorage.setItem('accessToken', accessToken)
            localStorage.setItem('refreshToken', refreshToken)
            api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

            scheduleTokenRefresh(accessToken, get().refreshAuthToken)
            onTokensRefreshedCallback?.()
          },

          setLoading: (loading: boolean) => {
            set({ isLoading: loading })
          },

          initialize: () => {
            const storedAccessToken = localStorage.getItem('accessToken')
            const storedRefreshToken = localStorage.getItem('refreshToken')
            const storedUser = localStorage.getItem('user')

            if (storedAccessToken && storedRefreshToken && storedUser) {
              set({
                accessToken: storedAccessToken,
                refreshToken: storedRefreshToken,
                user: JSON.parse(storedUser),
                isAuthenticated: true,
                isLoading: false
              })

              api.defaults.headers.common['Authorization'] = `Bearer ${storedAccessToken}`
              scheduleTokenRefresh(storedAccessToken, get().refreshAuthToken)
            } else {
              set({ isLoading: false })
            }
          }
        }
      },
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated
        })
      }
    ),
    { name: 'auth-store' }
  )
)