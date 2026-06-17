import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'

// Hook adaptador para manter a mesma API do NotificationContext
export const useNotifications = () => {
  const {
    notifications,
    setNotifications,
    markAsRead,
    markAllAsRead,
    unreadCount,
    hasNext,
    loadMore
  } = useNotificationStore()

  const { user } = useAuthStore()

  return {
    notifications,
    setNotifications,
    markAsRead,
    markAllAsRead,
    unreadCount,
    hasNext,
    loadMore
  }
}