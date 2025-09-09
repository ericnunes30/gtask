import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '@/common/types';
import { useBackendServices } from '../hooks/useBackendServices';
import { toast } from 'sonner';
import { api } from '@/services/backend/api'; // Import api instance

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuthToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const services = useBackendServices();
  const loginMutation = services.auth.useLogin();
  const logoutMutation = services.auth.useLogout();
  const refreshMutation = services.auth.useRefreshToken();

  const logout = useCallback(() => {
    api.defaults.headers.common['Authorization'] = '';
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/login');
    toast.info('Sua sessão expirou. Por favor, faça login novamente.');
  }, [navigate]);

  useEffect(() => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user');

    if (storedAccessToken && storedRefreshToken && storedUser) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      setUser(JSON.parse(storedUser));
      api.defaults.headers.common['Authorization'] = `Bearer ${storedAccessToken}`;
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await loginMutation.mutateAsync({ email, password });
      console.log('AuthContext - login - response from mutateAsync:', response);
      if (!response || !response.accessToken || !response.refreshToken || !response.user) {
        console.log('AuthContext - login - response.accessToken:', response.accessToken);
        console.log('AuthContext - login - response.refreshToken:', response.refreshToken);
        console.log('AuthContext - login - response.user:', response.user);
        throw new Error('Resposta de autenticação inválida do servidor');
      }

      const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: newUser } = response;

      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      localStorage.setItem('user', JSON.stringify(newUser));

      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      setUser(newUser);

      api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
      
      const origin = location.state?.from?.pathname || '/';
      navigate(origin);

      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      toast.error(error.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.');
      logout();
    }
  };

  const refreshAuthToken = useCallback(async (): Promise<boolean> => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      logout();
      return false;
    }

    try {
      const response = await refreshMutation.mutateAsync({ refreshToken: storedRefreshToken });
      console.log('AuthContext - refreshAuthToken - response from mutateAsync:', response);
      if (!response || !response.accessToken) {
        console.log('AuthContext - refreshAuthToken - response.accessToken:', response.accessToken);
        throw new Error('Invalid refresh token response');
      }

      const newAccessToken = response.accessToken;
      localStorage.setItem('accessToken', newAccessToken);
      setAccessToken(newAccessToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
      return true;
    } catch (error) {
      console.error('Failed to refresh token', error);
      logout();
      return false;
    }
  }, [logout, refreshMutation]);

  const value = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: !!accessToken,
    isLoading: isLoading || loginMutation.isPending,
    login,
    logout,
    refreshAuthToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
