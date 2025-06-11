import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios';
import { LoginCredentials, AuthResponse, User } from '@/common/types';

const API_URL = 'http://localhost:3333'; // Ajuste conforme sua URL da API

const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axios.post(`${API_URL}/session`, credentials);
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user_id', response.data.user_id);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');
    if (!token || !userId) {
      throw new Error('Token ou User ID não encontrados.');
    }
    const response = await axios.get(`${API_URL}/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  logout(): void {
    localStorage.removeItem('token');
  },

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  },
};

export const useLogin = () => {
  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
  })
}

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