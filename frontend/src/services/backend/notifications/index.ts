import { useOptimizedQuery, useOptimisticMutation, useCacheManager } from '@/hooks/useOptimizedQuery'
import { queryKeys } from '@/lib/react-query/keys'
import { api } from '../api'
import { toast } from '@/components/ui/use-toast'
import { queryClient } from '@/lib/react-query/config'
import { useQueryClient } from '@tanstack/react-query'

const notificationService = {
  // Fetch paginated structured notifications for the current user
  async getNotifications(params?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    types?: string[];
    priorities?: string[];
    startDate?: string;
    endDate?: string;
  }) {
    const start = Date.now();
    const q = {
      limit: params?.limit,
      offset: params?.offset,
      unreadOnly: params?.unreadOnly,
      types: params?.types,
      priorities: params?.priorities,
      startDate: params?.startDate,
      endDate: params?.endDate,
    } as Record<string, any>;
    // Remove undefined keys
    Object.keys(q).forEach((k) => q[k] === undefined && delete q[k]);
    const response = await api.get('/notifications', { params: q });
    return response.data;
  },

  // Mark a single notification as read
  async markAsRead(id: number | string) {
    // Backend expects PUT /notifications/:id/read
    await api.put(`/notifications/${id}/read`);
  },

  // Mark all notifications as read for the current user
  async markAllAsRead() {
    // Backend expects PUT /notifications/read-all
    await api.put('/notifications/read-all');
  },

  // Get unread count only
  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread-count');
    const payload = (response.data?.data ?? response.data) as any;
    return typeof payload?.count === 'number' ? payload.count : 0;
  },
}

export const useGetNotifications = (params?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  types?: string[];
  priorities?: string[];
  startDate?: string;
  endDate?: string;
}) =>
  useOptimizedQuery(
    queryKeys.notifications.list(params || {}),
    () => notificationService.getNotifications(params)
  )

export const useGetUnreadCount = () =>
  useOptimizedQuery(
    queryKeys.notifications.count(),
    notificationService.getUnreadCount
  )

export const useMarkAsRead = () => {
  const { setData } = useCacheManager()
  const queryClient = useQueryClient()

  return useOptimisticMutation({
    mutationFn: (id: number | string) => notificationService.markAsRead(id),

    onMutate: async (id) => {
      // Cancelar queries relacionadas
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.lists() })
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.count() })

      // Atualizar otimisticamente - marcar como lida
      setData(queryKeys.notifications.lists(), (old: any) => {
        if (!old || !Array.isArray(old)) return old
        return old.map(notification =>
          notification.id === id ? { ...notification, read: true } : notification
        )
      })

      return { id }
    },

    invalidateKeys: [
      [...queryKeys.notifications.lists()],
      [...queryKeys.notifications.count()],
    ] as readonly unknown[][],

    onSuccess: (_, id) => {
      toast({
        title: 'Sucesso',
        description: 'Notificação marcada como lida',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar a notificação como lida',
        variant: 'destructive',
      })
    },
  })
}

export const useMarkAllAsRead = () => {
  const { setData } = useCacheManager()
  const queryClient = useQueryClient()

  return useOptimisticMutation({
    mutationFn: () => notificationService.markAllAsRead(),

    onMutate: async () => {
      // Cancelar queries relacionadas
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.lists() })
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.count() })

      // Atualizar otimisticamente - marcar todas como lidas
      setData(queryKeys.notifications.lists(), (old: any) => {
        if (!old || !Array.isArray(old)) return old
        return old.map(notification => ({ ...notification, read: true }))
      })

      // Atualizar contador otimisticamente
      setData(queryKeys.notifications.count(), 0)

      return {}
    },

    invalidateKeys: [
      [...queryKeys.notifications.lists()],
      [...queryKeys.notifications.count()],
    ] as readonly unknown[][],

    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Todas as notificações foram marcadas como lidas',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar todas as notificações como lidas',
        variant: 'destructive',
      })
    },
  })
}

// Exportar as funções originais para compatibilidade
export const getNotifications = notificationService.getNotifications
export const markAsRead = notificationService.markAsRead
export const markAllAsRead = notificationService.markAllAsRead
export const getUnreadCount = notificationService.getUnreadCount