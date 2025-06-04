import axios from 'axios';
import logger from '../logger';

// Cria uma instância do axios com configurações padrão
const api = axios.create({
  baseURL: 'http://localhost:3333', // URL base do backend
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json; charset=utf-8',
  },
});

// Interceptor para adicionar o token de autenticação em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log detalhado para requisições PATCH
    if (config.method === 'patch') {
      logger.info('INTERCEPTOR - PATCH Request:', {
        url: config.url,
        data: JSON.stringify(config.data, null, 2),
        headers: config.headers,
      });
    }

    return config;
  },
  (error) => {
    logger.error('Erro na requisição:', error);
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => {
    // Garantir que os caracteres especiais sejam tratados corretamente
    if (response.data && typeof response.data === 'object') {
      // Processar strings para garantir codificação correta
      const processStrings = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;

        if (typeof obj === 'string') {
          // Tentar decodificar strings que possam ter problemas de codificação
          try {
            return obj;
          } catch (e) {
            logger.error('Erro ao processar string:', e);
            return obj;
          }
        }

        if (Array.isArray(obj)) {
          return obj.map(item => processStrings(item));
        }

        if (typeof obj === 'object') {
          const result: any = {};
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              result[key] = processStrings(obj[key]);
            }
          }
          return result;
        }

        return obj;
      };

      response.data = processStrings(response.data);
    }

    return response;
  },
  (error) => {
    logger.error('Erro na resposta:', error.response?.status, error.response?.data);

    // Se o erro for 401 (não autorizado), redireciona para a página de login
    if (error.response && error.response.status === 401) {
      logger.warn('Token inválido ou expirado, redirecionando para login');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    // Tratamento de erros específicos
    if (error.response && error.response.status === 404) {
      logger.error(`Endpoint ${error.config.url} não encontrado`);
    }

    return Promise.reject(error);
  }
);

export default api;
