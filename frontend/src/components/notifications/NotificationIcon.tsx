import React from 'react'
import { Bell, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotifications } from '@/contexts/adapters/NotificationContextAdapter'
import { formatNotification } from '@/utils/notificationFormatter'
import { useTaskModal } from '@/contexts/adapters/TaskModalContextAdapter'
import { toast } from 'sonner'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import { transformApiTaskToFrontend } from '@/utils/apiTransformers'

const NotificationIcon: React.FC = () => {
  const { unreadCount, notifications, markAllAsRead, markAsRead, hasNext, loadMore } = useNotifications()
  const { openTask } = useTaskModal()
  const pretty = (s?: string) => (s || '').replace(/_/g, ' ').replace(/\./g, ' ? ')

  const getTaskIdFromData = (data: any): number | undefined => {
    if (!data) return undefined
    if (typeof data.taskId === 'number') return data.taskId
    if (data.entityType === 'task' && typeof data.entityId === 'number') return data.entityId
    if (Array.isArray(data.relatedEntities)) {
      const t = data.relatedEntities.find((e: any) => e?.type === 'task' && typeof e?.id === 'number')
      if (t) return t.id
    }
    const timerTaskId = data?.changes?.timer?.newValue?.taskId
    if (typeof timerTaskId === 'number') return timerTaskId
    const ctxTaskId = data?.context?.additionalData?.taskId
    if (typeof ctxTaskId === 'number') return ctxTaskId
    return undefined
  }

  const tryResolveTaskIdAndOpen = async (n: any) => {
    const t = String(n.type || '').toLowerCase()
    const maybeTaskId = getTaskIdFromData(n.data)
    console.debug('[Notifications] item click', { id: n.id, type: t, taskId: maybeTaskId })
    if ((t.includes('comment') || t.includes('task')) && typeof maybeTaskId === 'number') {
      openTask(maybeTaskId)
      return
    }
    // Fallback: tentar resolver por título da tarefa nas notificações antigas
    const taskTitle: string | undefined = n?.data?.taskTitle
    if ((t.includes('comment') || t.includes('task')) && taskTitle) {
      try {
        const resp = await api.get(ROUTES.tasks)
        const items = Array.isArray(resp?.data?.data) ? resp.data.data : []
        const tasks = items.map(transformApiTaskToFrontend)
        const match = tasks.find((tk: any) => String(tk.title).trim() === String(taskTitle).trim())
        if (match && typeof match.id === 'number') {
          openTask(match.id)
          return
        }
      } catch (e) {
        console.warn('[Notifications] fallback task fetch failed', e)
      }
      toast.info('Não foi possível abrir a tarefa desta notificação')
      return
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] h-5 min-w-5 px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="font-medium text-sm">Notificações</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7" onClick={() => markAllAsRead()}>
              Marcar como lidas
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-auto">
          {notifications.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">Sem notificações</div>
          )}
          {notifications.map((n) => {
            const unread = !n.readAt
            const { title, message } = formatNotification({ type: n.type, data: n.data })
            const displayTitle = title || pretty(n.type) || 'Notificação'
            const displayMessage = n.message || message
            return (
              <DropdownMenuItem
                key={n.id}
                className="group whitespace-normal py-3 text-sm"
                onSelect={async () => { await tryResolveTaskIdAndOpen(n) }}
              >
                <div className="flex items-start gap-3 w-full">
                  <span className={`mt-1 inline-block h-2 w-2 rounded-full ${unread ? 'bg-primary' : 'bg-muted-foreground/30'}`} aria-hidden />
                  <div className="flex-1 space-y-1">
                    <div className={`leading-none ${unread ? 'font-semibold' : 'font-medium'} group-data-[highlighted]:text-white`}>{displayTitle}</div>
                    {displayMessage && (
                      <div className="text-muted-foreground leading-snug group-data-[highlighted]:text-white/90">
                        {displayMessage}
                      </div>
                    )}
                    {n.createdAt && (
                      <div className="text-xs text-muted-foreground group-data-[highlighted]:text-white/80">
                        {new Date(n.createdAt).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                  {unread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {e.stopPropagation()
                        markAsRead(n.id)
                      }}
                      title="Marcar como lida"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </DropdownMenuItem>
            )
          })}
          {hasNext && notifications.length > 0 && (
            <div className="p-2 border-t">
              <Button variant="ghost" size="sm" className="w-full" onClick={() => loadMore?.()}>
                Carregar mais
              </Button>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationIcon
