import { useSocketStore } from '@/stores/socketStore'

// Hook adaptador para manter a mesma API do SocketContext
export const useSocket = () => {
  const { socket, isConnected } = useSocketStore()

  return {
    socket,
    isConnected
  }
}