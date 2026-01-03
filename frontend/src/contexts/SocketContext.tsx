
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { socket as sharedSocket } from '@/services/backend/websocket/ws';
import { useAuth } from './adapters/AuthContextAdapter';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);

  const socket = sharedSocket;
  const { accessToken, refreshAuthToken } = useAuth();

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onError = () => setIsConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
    };
  }, [socket]);

  // Keep WS auth token in sync with latest accessToken
  useEffect(() => {
    if (!socket) return;
    if (accessToken) {
      socket.auth = { token: accessToken } as any;
      if (socket.disconnected) socket.connect();
    } else {
      if (socket.connected) socket.disconnect();
    }
  }, [socket, accessToken]);

  // On invalid token, try silent refresh once and reconnect
  useEffect(() => {
    if (!socket) return;
    let tried = false;
    const handler = async (err: any) => {
      if (tried) return;
      if (typeof err?.message === 'string' && err.message.includes('Invalid token')) {
        tried = true;
        const ok = await refreshAuthToken();
        if (ok) {
          const newToken = localStorage.getItem('accessToken');
          socket.auth = newToken ? ({ token: newToken } as any) : undefined;
          socket.connect();
        }
      }
    };
    socket.on('connect_error', handler);
    return () => {
      socket.off('connect_error', handler);
    };
  }, [socket, refreshAuthToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
