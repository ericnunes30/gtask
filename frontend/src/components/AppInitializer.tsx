import React, { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useSocketStore } from '@/stores/socketStore'
import { useNotificationStore } from '@/stores/notificationStore'

interface AppInitializerProps {
  children: React.ReactNode
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  // Inicializar auth store
  const initializeAuth = useAuthStore((state) => state.initialize)

  // Obter referências às stores
  const initializeSocket = useSocketStore((state) => state.initializeSocket)
  const updateAuth = useSocketStore((state) => state.updateAuth)
  const initializeSocketListeners = useNotificationStore((state) => state.initializeSocketListeners)
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications)
  const user = useAuthStore((state) => state.user)

  // Inicializar auth quando o componente montar
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  // Configurar socket listeners
  useEffect(() => {
    const cleanup = initializeSocket()
    return cleanup
  }, [initializeSocket])

  // Atualizar auth do socket quando o token mudar
  useEffect(() => {
    updateAuth()
  }, [updateAuth])

  // Configurar listeners de notificações
  useEffect(() => {
    const cleanup = initializeSocketListeners()
    return cleanup
  }, [initializeSocketListeners])

  // Buscar notificações quando o usuário estiver autenticado
  useEffect(() => {
    if (user) {
      fetchNotifications({ append: false, page: 1 })
    }
  }, [user, fetchNotifications])

  return <>{children}</>
}