import axios, { AxiosError } from 'axios';

const runtimeUrl = (typeof window !== 'undefined' && (window as any).__ENV__ && (window as any).__ENV__.BACKEND_API_URL) as string | undefined;
const API_URL = runtimeUrl || import.meta.env.VITE_BACKEND_API_URL;

export const api = axios.create({
  baseURL: API_URL,
});

let isRefreshing = false;
let failedRequestsQueue: { resolve: (token: string) => void; reject: (error: AxiosError) => void; }[] = [];

export function setupAuthInterceptor(
  refreshAuthToken: () => Promise<boolean>,
  logout: () => void
) {
  api.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        const originalRequest = error.config;
        if (!originalRequest) return Promise.reject(error);

        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const wasRefreshed = await refreshAuthToken();
            if (wasRefreshed) {
              const newAccessToken = localStorage.getItem('accessToken');
              failedRequestsQueue.forEach(request => request.resolve(newAccessToken!));
              failedRequestsQueue = [];
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return axios(originalRequest);
            } else {
              logout();
              return Promise.reject(error);
            }
          } catch (refreshError) {
            failedRequestsQueue.forEach(request => request.reject(error));
            failedRequestsQueue = [];
            logout();
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axios(originalRequest);
        });
      }

      return Promise.reject(error);
    }
  );
}
