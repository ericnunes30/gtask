import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { User } from '@/utils/commonTypes'
import { toast } from 'sonner'
import { api } from '@/services/backend/api'

interface DecodedJwt {
  exp?: number
  iat?: number
  sub?: number
}

function parseJwt(token: string): DecodedJwt | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload) as DecodedJwt
  } catch {
    return null
  }
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  isAuthenticated: boolean

  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshAuthToken: () => Promise<boolean>
  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setLoading: (loading: boolean) => void
  initialize: () => void
}

let tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null

function scheduleTokenRefresh(accessToken: string, refresh: () => Promise<boolean>) {
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer)
    tokenRefreshTimer = null
  }

  const decoded = parseJwt(accessToken)
  if (!decoded?.exp) return

  const expiresAt = decoded.exp * 1000
  const now = Date.now()
  const ttl = Math.max(0, expiresAt - now)
  const refreshIn = Math.max(Math.floor(ttl * 0.2), Math.min(ttl - 30000, ttl * 0.2))

  if (refreshIn <= 0) {
    void refresh()
    return
  }

  tokenRefreshTimer = setTimeout(() => {
    void refresh()
  }, refreshIn)
}

function clearTokenRefreshTimer() {
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer)
    tokenRefreshTimer = null
  }
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoading: true,
        isAuthenticated: false,

        login: async (email: string, password: string) => {
          try {
            set({ isLoading: true })

            const response = await api.post('/auth/login', { email, password })
            const data = response.data.data || response.data

            if (!data || !data.accessToken || !data.refreshToken || !data.user) {
              throw new Error('Resposta de autenticação inválida do servidor')
            }

            const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: newUser } = data

            set({
              user: newUser,
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
              isAuthenticated: true,
              isLoading: false
            })

            localStorage.setItem('accessToken', newAccessToken)
            localStorage.setItem('refreshToken', newRefreshToken)
            localStorage.setItem('user', JSON.stringify(newUser))

            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`

            scheduleTokenRefresh(newAccessToken, () => get().refreshAuthToken())

            toast.success('Login realizado com sucesso!')
          } catch (error: any) {
            console.error('Erro ao fazer login:', error)
            toast.error(error.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.')
            get().logout()
          }
        },

        logout: () => {
          clearTokenRefreshTimer()
          api.defaults.headers.common['Authorization'] = ''
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false
          })

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
            const newRefreshToken = data.refreshToken || refreshToken

            set({
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
              isAuthenticated: true
            })

            localStorage.setItem('accessToken', newAccessToken)
            localStorage.setItem('refreshToken', newRefreshToken)

            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`

            scheduleTokenRefresh(newAccessToken, () => get().refreshAuthToken())

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

          scheduleTokenRefresh(accessToken, () => get().refreshAuthToken())
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

            scheduleTokenRefresh(storedAccessToken, () => get().refreshAuthToken())
          } else {
            set({ isLoading: false })
          }
        }
      }),
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
