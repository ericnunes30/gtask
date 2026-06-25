import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const runtimeUrl =
  (typeof window !== 'undefined' &&
    (window as unknown as { __ENV__?: Record<string, string> }).__ENV__ &&
    (window as unknown as { __ENV__?: Record<string, string> }).__ENV__
      ?.BACKEND_API_URL) as string | undefined;
const API_URL =
  (import.meta.env as unknown as Record<string, string | undefined>)
    .VITE_BACKEND_API_URL || runtimeUrl;

export const api = axios.create({
  baseURL: API_URL,
});

let isRefreshing = false;
let failedRequestsQueue: {
  resolve: (token: string) => void;
  reject: (error: AxiosError) => void;
}[] = [];

let requestInterceptorId: number | null = null;
let responseInterceptorId: number | null = null;

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export interface InterceptorCallbacks {
  refreshAuthToken: () => Promise<boolean>;
  logout: () => void;
  onRefreshed?: (token: string) => void;
}

export function setupAuthInterceptor({
  refreshAuthToken,
  logout,
  onRefreshed,
}: InterceptorCallbacks) {
  // Request interceptor: always attach the most recent access token.
  requestInterceptorId = api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }
  );

  // Response interceptor: silent refresh on 401.
  responseInterceptorId = api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        const originalRequest = error.config;
        if (!originalRequest) return Promise.reject(error);

        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const wasRefreshed = await refreshAuthToken();
            if (wasRefreshed) {
              const newAccessToken = getAccessToken();
              failedRequestsQueue.forEach((request) =>
                request.resolve(newAccessToken!)
              );
              failedRequestsQueue = [];
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              if (onRefreshed && newAccessToken) {
                onRefreshed(newAccessToken);
              }
              return axios(originalRequest);
            } else {
              logout();
              return Promise.reject(error);
            }
          } catch (refreshError) {
            failedRequestsQueue.forEach((request) => request.reject(error));
            failedRequestsQueue = [];
            logout();
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axios(originalRequest);
        });
      }

      return Promise.reject(error);
    }
  );
}

export function ejectAuthInterceptor() {
  if (requestInterceptorId !== null) {
    api.interceptors.request.eject(requestInterceptorId);
    requestInterceptorId = null;
  }
  if (responseInterceptorId !== null) {
    api.interceptors.response.eject(responseInterceptorId);
    responseInterceptorId = null;
  }
}
