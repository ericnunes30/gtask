import { useOptimisticMutation, useOptimizedQuery, useCacheManager } from '@/hooks/useOptimizedQuery'
import { queryKeys } from '@/lib/react-query/keys'
import { LoginCredentials, AuthResponse, User } from '@/common/types'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import { toast } from '@/components/ui/use-toast'

const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post(ROUTES.auth.login, credentials);
    
    // Backend-2 returns: { accessToken: "...", refreshToken: "...", user: {...} }
    const { accessToken, refreshToken, user } = response.data.data;
    
    // AuthContext will handle storing tokens in localStorage

    return {
      accessToken,
      refreshToken,
      user,
    };
  },

  async getCurrentUser(): Promise<User> {
    // AuthContext will handle token presence
    const response = await api.get(ROUTES.auth.profile);
    // Backend-2 returns: { data: { userId: ..., email: ..., name: ... } }
    const userData = response.data.data;
    return userData as User;
  },

  logout(): void {
    // AuthContext will handle removing tokens from localStorage
  },

  isAuthenticated(): boolean {
    // AuthContext will handle token presence check
    return true; // This will be handled by AuthContext's state
  },
};

export const useLogin = () => {
  const { clear } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: async (credentials: LoginCredentials) => await authService.login(credentials),

    onSuccess: (data) => {
      toast({
        title: 'Bem-vindo!',
        description: `Login realizado com sucesso, ${data.user.name}`,
      })
    },

    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Erro ao fazer login'
      toast({
        title: 'Erro no login',
        description: message,
        variant: 'destructive',
      })
    },
  })
}

export const useRefreshToken = () => {
  return useOptimisticMutation({
    mutationFn: async (payload: { refreshToken: string }) => {
      const response = await api.post(ROUTES.auth.refresh, payload)
      return response.data.data // Should return { accessToken: string }
    },

    onError: (error: any) => {
      console.error('Token refresh failed:', error)
      // Limpar cache e redirecionar para login
      clear()
      window.location.href = '/login'
    },
  })
}

export const useGetCurrentUser = (enabled = true) => {
  return useOptimizedQuery(
    queryKeys.users.currentUser,
    () => authService.getCurrentUser(),
    {
      enabled: enabled && authService.isAuthenticated(),
      retry: false,
      staleTime: 1000 * 60 * 10, // 10 minutos - dados de usuário mudam moderadamente
      onError: (error: any) => {
        if (error.response?.status === 401) {
          // Token expirado ou inválido
          window.location.href = '/login'
        }
      },
    }
  )
}

export const useLogout = () => {
  const { clear } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: () => {
      authService.logout()
      return Promise.resolve()
    },
    onSuccess: () => {
      clear()
      toast({
        title: 'Até logo!',
        description: 'Logout realizado com sucesso',
      })
      // Redirecionar após um breve delay
      setTimeout(() => {
        window.location.href = '/login'
      }, 1000)
    },
  })
}

export const useAuthStatus = () => {
  const { hasData } = useCacheManager()

  return {
    isAuthenticated: authService.isAuthenticated() && hasData(queryKeys.users.currentUser),
  }
}
