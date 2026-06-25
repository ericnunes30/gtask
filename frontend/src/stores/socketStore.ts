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
  initializeSocket: () => () => void
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
          if (!socket) return () => {}

          const { refreshAuthToken } = useAuthStore.getState()

          const onConnect = () => {
            set({ isConnected: true })
            // Reset flag so future disconnects can attempt refresh again.
            tokenRefreshAttempted = false
          }

          const onDisconnect = () => {
            set({ isConnected: false })
          }

          const onConnectError = async (err: unknown) => {
            set({ isConnected: false })

            const message =
              err && typeof (err as { message?: unknown }).message === 'string'
                ? (err as { message: string }).message
                : ''

            // Handle token refresh once per disconnect cycle.
            if (
              !tokenRefreshAttempted &&
              message.toLowerCase().includes('invalid token')
            ) {
              tokenRefreshAttempted = true
              const success = await refreshAuthToken()
              if (success) {
                // Auth function in ws.ts will read the new token from LS.
                socket.connect()
              }
            }
          }

          socket.on('connect', onConnect)
          socket.on('disconnect', onDisconnect)
          socket.on('connect_error', onConnectError)

          // Keep socket auth in sync whenever the access token changes.
          const unsubscribeAuth = useAuthStore.subscribe((state, prevState) => {
            if (state.accessToken !== prevState.accessToken) {
              get().updateAuth()
            }
          })

          // Cleanup
          return () => {
            socket.off('connect', onConnect)
            socket.off('disconnect', onDisconnect)
            socket.off('connect_error', onConnectError)
            unsubscribeAuth()
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

          if (!socket) return

          if (accessToken && socket.disconnected) {
            socket.connect()
          } else if (!accessToken && socket.connected) {
            socket.disconnect()
          }
        }
      }
    },
    { name: 'socket-store' }
  )
)
