import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LoginCredentials, AuthResponse, User } from '@/common/types'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'

const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.log('authService - login - credentials:', credentials);
    const response = await api.post(ROUTES.auth.login, credentials);
    console.log('authService.login - raw api response:', response);
    console.log('authService.login - response.data:', response.data);
    
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
    console.log('authService - getCurrentUser - fetching...');
    // AuthContext will handle token presence
    const response = await api.get(ROUTES.auth.profile);
    console.log('authService - getCurrentUser - response:', response);
    // Backend-2 returns: { data: { userId: ..., email: ..., name: ... } }
    const userData = response.data.data;
    console.log('authService - getCurrentUser - userData:', userData);
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
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => await authService.login(credentials),
  })
}

export const useRefreshToken = () => {
  return useMutation({
    mutationFn: async (payload: { refreshToken: string }) => {
      const response = await api.post(ROUTES.auth.refresh, payload);
      console.log('useRefreshToken - raw api response:', response);
      console.log('useRefreshToken - response.data:', response.data);
                return response.data.data; // Should return { accessToken: string } // <-- CORRIGIDO
    },
  });
};

export const useGetCurrentUser = (enabled = true) => {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser(),
    enabled: enabled && authService.isAuthenticated(),
    retry: false,
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => {
      authService.logout()
      return Promise.resolve()
    },
    onSuccess: () => {
      queryClient.clear()
    },
  })
}

export const useAuthStatus = () => {
  return {
    isAuthenticated: authService.isAuthenticated(),
  }
}