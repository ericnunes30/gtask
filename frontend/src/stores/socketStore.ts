import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Socket } from 'socket.io-client'
import { socket as sharedSocket } from '@/services/backend/websocket/ws'
import { useAuthStore } from './authStore'

interface SocketState {
  socket: Socket | null
  isConnected: boolean

  // Ações
  setConnected: (connected: boolean) => void
  initializeSocket: () => void
  disconnectSocket: () => void
  updateAuth: () => void
}

export const useSocketStore = create<SocketState>()(
  devtools(
    (set, get) => {
      let tokenRefreshAttempted = false

      return {
        // Estado inicial
        socket: sharedSocket,
        isConnected: false,

        // Ações
        setConnected: (isConnected) => set({ isConnected }),

        initializeSocket: () => {
          const socket = get().socket
          if (!socket) return

          const { accessToken, refreshAuthToken } = useAuthStore.getState()

          // Event listeners
          const onConnect = () => {
            set({ isConnected: true })
          }

          const onDisconnect = () => {
            set({ isConnected: false })
          }

          const onError = () => {
            set({ isConnected: false })
          }

          const onConnectError = async (err: any) => {
            set({ isConnected: false })

            // Handle token refresh
            if (!tokenRefreshAttempted && typeof err?.message === 'string' && err.message.includes('Invalid token')) {
              tokenRefreshAttempted = true
              const success = await refreshAuthToken()
              if (success) {
                const newToken = useAuthStore.getState().accessToken
                socket.auth = newToken ? ({ token: newToken } as any) : undefined
                socket.connect()
              }
            }
          }

          socket.on('connect', onConnect)
          socket.on('disconnect', onDisconnect)
          socket.on('connect_error', onError)
          socket.on('connect_error', onConnectError)

          // Cleanup
          return () => {
            socket.off('connect', onConnect)
            socket.off('disconnect', onDisconnect)
            socket.off('connect_error', onError)
            socket.off('connect_error', onConnectError)
          }
        },

        disconnectSocket: () => {
          const socket = get().socket
          if (socket && socket.connected) {
            socket.disconnect()
          }
          set({ isConnected: false })
        },

        updateAuth: () => {
          const socket = get().socket
          const { accessToken } = useAuthStore.getState()

          if (socket) {
            socket.auth = accessToken ? ({ token: accessToken } as any) : undefined

            if (accessToken && socket.disconnected) {
              socket.connect()
            } else if (!accessToken && socket.connected) {
              socket.disconnect()
            }
          }
        }
      }
    },
    { name: 'socket-store' }
  )
)