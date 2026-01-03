import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { User } from '@/utils/commonTypes'
import { toast } from 'sonner'
import { api } from '@/services/backend/api'

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

              toast.success('Login realizado com sucesso!')
            } catch (error: any) {
              console.error('Erro ao fazer login:', error)
              toast.error(error.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.')
              get().logout()
            }
          },

          logout: () => {
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

              // Atualizar store
              set({
                accessToken: newAccessToken,
                isAuthenticated: true
              })

              // Atualizar localStorage
              localStorage.setItem('accessToken', newAccessToken)

              // Atualizar axios
              api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`

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