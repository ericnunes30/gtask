import { io, Socket } from 'socket.io-client';

// Resolve WS URL from envs or fallback
const runtimeEnv =
  (typeof window !== 'undefined'
    ? (window as unknown as { __ENV__?: Record<string, string> }).__ENV__
    : undefined) || {};
const explicitWs =
  runtimeEnv.BACKEND_WS_URL ||
  (import.meta.env as unknown as Record<string, string | undefined>)
    .VITE_SOCKET_URL ||
  (import.meta.env as unknown as Record<string, string | undefined>)
    .VITE_BACKEND_WS_URL;
const apiUrl =
  (runtimeEnv.BACKEND_API_URL as string | undefined) ||
  ((import.meta.env as unknown as Record<string, string | undefined>)
    .VITE_BACKEND_API_URL as string | undefined);

function resolveUrl(): string {
  if (explicitWs) return explicitWs as string;
  if (apiUrl) {
    try {
      const u = new URL(apiUrl);
      const protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${u.host}`; // origin only
    } catch {
      // fallback below
    }
  }
  return 'http://localhost:3334';
}

const url = resolveUrl();

/**
 * Socket.io singleton. We do NOT capture the token at import time; instead,
 * `auth` is a function so every handshake (including reconnections) reads the
 * current access token from localStorage. `autoConnect: false` lets the auth
 * store decide when to connect.
 */
export const socket: Socket = io(url, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  withCredentials: true,
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  auth: () => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken')
        : null;
    return token ? { token } : {};
  },
});

// Minimal console logs to identify connection state
socket.on('connect', () => {
  console.log('[WS] connected', { id: socket.id, url });
});

socket.on('disconnect', (reason) => {
  console.log('[WS] disconnected', { reason });
});

socket.on('connect_error', (err) => {
  console.error('[WS] connect_error', {
    message: err.message,
    data: (err as unknown as { data?: unknown }).data,
  });
});
