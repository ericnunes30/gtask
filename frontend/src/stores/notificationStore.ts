import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useAuthStore } from './authStore'
import { useSocketStore } from './socketStore'
import { toast } from 'sonner'
import { formatNotification } from '@/utils/notificationFormatter'
import { api } from '@/services/backend/api'

interface Notification {
  id: string
  type: string
  message: string
  data: any
  createdAt: string
  readAt?: string
}

interface NotificationState {
  // Estado
  notifications: Notification[]
  unreadCount: number
  page: number
  hasNext: boolean

  // Ações
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  loadMore: () => Promise<void>
  addNotification: (notification: Notification) => void
  setNotifications: (notifications: Notification[]) => void
  fetchNotifications: (opts?: { append?: boolean; page?: number }) => Promise<void>
  initializeSocketListeners: () => void
}

const PAGE_SIZE = 10

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => {
      return {
        // Estado inicial
        notifications: [],
        unreadCount: 0,
        page: 1,
        hasNext: false,

        // Ações
        markAsRead: async (notificationId: string) => {
          // Optimistic update
          set((state) => ({
            notifications: state.notifications.map(n =>
              n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1)
          }))

try {
            await api.put(`/notifications/${notificationId}/read`)
            // Não precisa chamar fetchNotifications novamente - o update otimista já cuidou disso
          } catch (err) {
            console.error('[Notifications] Failed to mark as read', err)
            // Reverter em caso de erro
            set((state) => ({
              notifications: state.notifications.map(n =>
                n.id === notificationId ? { ...n, readAt: undefined } : n
              ),
              unreadCount: state.unreadCount + 1
            }))
          }
        },

        markAllAsRead: async () => {
          // Optimistic update
          set((state) => ({
            notifications: state.notifications.map(n => ({ ...n, readAt: new Date().toISOString() })),
            unreadCount: 0
          }))

try {
            await api.put('/notifications/read-all')
            await get().fetchNotifications({ append: false, page: 1 })
          } catch (err) {
            console.error('[Notifications] Failed to mark all as read', err)
          }
        },

        loadMore: async () => {
          const { hasNext, page } = get()
          if (!hasNext) return
          await get().fetchNotifications({ append: true, page: page + 1 })
        },

        addNotification: (notification: Notification) => {
          set((state) => {
            const newNotifications = [notification, ...state.notifications]
            return {
              notifications: newNotifications,
              unreadCount: newNotifications.filter(n => !n.readAt).length
            }
          })

          // Show toast (simplified)
          const { title: humanTitle } = formatNotification({ type: notification.type, data: notification.data })
          const title = humanTitle || 'Notificação'
          const desc = notification.message || ''

          toast.info(title, { description: desc })
        },

        setNotifications: (notifications: Notification[]) => {
          set({
            notifications,
            unreadCount: notifications.filter(n => !n.readAt).length
          })
        },

        fetchNotifications: async (opts?: { append?: boolean; page?: number }) => {
          try {
            const { page: currentPage } = get()
            const targetPage = opts?.page ?? (opts?.append ? currentPage + 1 : 1)

            console.log('[Notifications] Fetching notifications...', { page: targetPage, append: opts?.append })

            const response = await api.get('/notifications', {
              params: {
                limit: PAGE_SIZE,
                offset: (targetPage - 1) * PAGE_SIZE
              }
            })

            const data = response.data
            const payload = (data?.data ?? data) as any
            const items = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : [])

            const mapped: Notification[] = items.map((n: any) => {
              const base: Notification = {
                id: String(n.id ?? ''),
                type: n.type ?? '',
                data: n.data ?? {},
                message: '',
                createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
                readAt: n.readAt ?? (n.isRead ? new Date().toISOString() : undefined),
              }

              const { title: humanTitle, message } = formatNotification({ type: base.type, data: base.data })
              return { ...base, message }
            })

            set((state) => {
              if (opts?.append) {
                const existing = new Set(state.notifications.map(p => p.id))
                const merged = [...state.notifications, ...mapped.filter(m => !existing.has(m.id))]
                return {
                  notifications: merged,
                  page: targetPage
                }
              } else {
                // Sort by createdAt desc to match backend order
                mapped.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                return {
                  notifications: mapped,
                  page: targetPage
                }
              }
            })

            const unread = Array.isArray(items) ? items.filter((n: any) => n.isRead === false).length : 0
            const next = Boolean((payload && payload.hasNext) ?? (items.length === PAGE_SIZE))

            set({
              unreadCount: unread,
              hasNext: next
            })

            console.log('[Notifications] Notifications loaded', {
              total: mapped.length,
              unread,
              page: targetPage,
              hasNext: next
            })
          } catch (err) {
            console.error('[Notifications] Failed to fetch notifications', err)
          }
        },

        initializeSocketListeners: () => {
          const { socket } = useSocketStore.getState()

          if (!socket) return

          const handleIncoming = (incoming: any) => {
            const base: Notification = {
              id: String(incoming?.id ?? ''),
              type: String(incoming?.type ?? ''),
              data: incoming?.data ?? {},
              message: '',
              createdAt: incoming?.createdAt ? new Date(incoming.createdAt).toISOString() : new Date().toISOString(),
              readAt: incoming?.readAt,
            }

            const { title: humanTitle, message } = formatNotification({ type: base.type, data: base.data })
            const notification: Notification = { ...base, message }

            get().addNotification(notification)
          }

          socket.on('notification', handleIncoming as any)
          socket.on('new_structured_notification', handleIncoming as any)

          return () => {
            socket.off('notification', handleIncoming)
            socket.off('new_structured_notification', handleIncoming)
          }
        }
      }
    },
    { name: 'notification-store' }
  )
)