
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './adapters/AuthContextAdapter';
import { toast } from 'sonner';
import { Bell, MessageSquare, Play, Pause, ClipboardList, BellRing } from 'lucide-react';
import { useBackendServices } from '@/hooks/useBackendServices';
import { formatNotification } from '@/utils/notificationFormatter';

interface Notification {
  id: string;
  type: string;
  message: string;
  data: any;
  createdAt: string;
  readAt?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  unreadCount: number;
  hasNext: boolean;
  loadMore: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const services = useBackendServices();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const PAGE_SIZE = 10;

  const fetchNotifications = useCallback(async (opts?: { append?: boolean; page?: number }) => {
    try {
      console.log('[Notifications] Fetching initial notifications...');
      const targetPage = opts?.page ?? (opts?.append ? page + 1 : 1);
      const data = await services.notifications.getNotifications({ limit: PAGE_SIZE, offset: (targetPage - 1) * PAGE_SIZE });
      const payload = (data?.data ?? data) as any;
      const items = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);
      const mapped: Notification[] = items.map((n: any) => {
        const base: Notification = {
          id: String(n.id ?? ''),
          type: n.type ?? '',
          data: n.data ?? {},
          message: '',
          createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
          readAt: n.readAt ?? (n.isRead ? new Date().toISOString() : undefined),
        };
        const { title: humanTitle, message } = formatNotification({ type: base.type, data: base.data });
        return { ...base, message };
      });
      // If appending, merge without duplicates
      if (opts?.append) {
        setNotifications(prev => {
          const existing = new Set(prev.map(p => p.id));
          const merged = [...prev, ...mapped.filter(m => !existing.has(m.id))];
          return merged;
        });
        setPage(targetPage);
      } else {
        // Sort by createdAt desc to match backend order
        mapped.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setNotifications(mapped);
        setPage(targetPage);
      }
      const unread = Array.isArray(items) ? items.filter((n: any) => n.isRead === false).length : 0;
      setUnreadCount(unread);
      const next = Boolean((payload && payload.hasNext) ?? (items.length === PAGE_SIZE));
      setHasNext(next);
      console.log('[Notifications] Notifications loaded', { total: mapped.length, unread, page: targetPage, hasNext: next });
    } catch (err) {
      // Non-blocking: keep WS-only if REST fails
      console.error('[Notifications] Failed to fetch notifications', err);
    }
  }, [services.notifications, page]);

  useEffect(() => {
    if (user) {
      fetchNotifications({ append: false, page: 1 });
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    if (!socket) return;

    const getIconAndKind = (type?: string) => {
      const t = (type || '').toLowerCase();
      if (t.includes('comment')) return { icon: <MessageSquare className="h-4 w-4" />, kind: 'info' as const };
      if (t.includes('status')) return { icon: <ClipboardList className="h-4 w-4" />, kind: 'info' as const };
      if (t.includes('timer.started')) return { icon: <Play className="h-4 w-4" />, kind: 'success' as const };
      if (t.includes('timer.paused')) return { icon: <Pause className="h-4 w-4" />, kind: 'warning' as const };
      if (t.includes('task.created')) return { icon: <BellRing className="h-4 w-4" />, kind: 'success' as const };
      return { icon: <Bell className="h-4 w-4" />, kind: 'info' as const };
    };

    const pretty = (s?: string) => (s || '').replace(/_/g, ' ').replace(/\./g, ' · ');

    const handleIncoming = (incoming: any) => {
      const base: Notification = {
        id: String(incoming?.id ?? ''),
        type: String(incoming?.type ?? ''),
        data: incoming?.data ?? {},
        message: '',
        createdAt: incoming?.createdAt ? new Date(incoming.createdAt).toISOString() : new Date().toISOString(),
        readAt: incoming?.readAt,
      };
      const { title: humanTitle, message } = formatNotification({ type: base.type, data: base.data });
      const notification: Notification = { ...base, message };
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      const { icon, kind } = getIconAndKind(notification.type);
      const title = humanTitle || 'Notificação';
      const desc = notification.message || '';
      if (kind === 'success') toast.success(title, { icon, description: desc });
      else if (kind === 'warning') toast.warning(title, { icon, description: desc });
      else toast.info(title, { icon, description: desc });
    };

    socket.on('notification', handleIncoming as any);
    socket.on('new_structured_notification', handleIncoming as any);

    return () => {
      socket.off('notification', handleIncoming);
      socket.off('new_structured_notification', handleIncoming as any);
    };
  }, [socket]);

  const markAsRead = async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await services.notifications.markAsRead(notificationId);
      await fetchNotifications();
    } catch (err) {
      console.error('[Notifications] Failed to mark as read', err);
    }
  };

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await services.notifications.markAllAsRead();
      await fetchNotifications({ append: false, page: 1 });
    } catch (err) {
      console.error('[Notifications] Failed to mark all as read', err);
    }
  };

  const loadMore = async () => {
    if (!hasNext) return;
    await fetchNotifications({ append: true, page: page + 1 });
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        setNotifications,
        markAsRead,
        markAllAsRead,
        unreadCount,
        hasNext,
        loadMore,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};



