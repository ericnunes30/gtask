import { io, Socket } from 'socket.io-client';

// Resolve WS URL from envs or fallback
const runtimeEnv = (typeof window !== 'undefined' ? (window as any).__ENV__ : undefined) || {};
const explicitWs = runtimeEnv.BACKEND_WS_URL || (import.meta.env as any).VITE_SOCKET_URL || (import.meta.env as any).VITE_BACKEND_WS_URL;
const apiUrl = (runtimeEnv.BACKEND_API_URL as string | undefined) || ((import.meta.env as any).VITE_BACKEND_API_URL as string | undefined);

function resolveUrl(): string {
  if (explicitWs) return explicitWs as string;
  if (apiUrl) {
    try {
      const u = new URL(apiUrl);
      const protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${u.host}`; // origin only
    } catch {}
  }
  return 'http://localhost:3334';
}

const url = resolveUrl();
const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

export const socket: Socket = io(url, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  auth: token ? { token } : undefined,
});

// Minimal console logs to identify connection state
socket.on('connect', () => {
  console.log('[WS] connected', { id: socket.id, url });
});

socket.on('disconnect', (reason) => {
  console.log('[WS] disconnected', { reason });
});

socket.on('connect_error', (err) => {
  console.error('[WS] connect_error', { message: err.message, data: (err as any)?.data });
});
