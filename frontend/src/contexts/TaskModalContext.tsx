import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import TaskDetailsModal from '@/components/tasks/TaskDetailsModal'

interface TaskModalContextType {
  openTask: (taskId: number) => void
  close: () => void
}

const TaskModalContext = createContext<TaskModalContextType | undefined>(undefined)

export const useTaskModal = () => {
  const ctx = useContext(TaskModalContext)
  if (!ctx) throw new Error('useTaskModal must be used within TaskModalProvider')
  return ctx
}

export const TaskModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [taskId, setTaskId] = useState<number | null>(null)

  const openTask = useCallback((id: number) => {
    if (typeof id !== 'number' || Number.isNaN(id)) return
    setTaskId(id)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const value = useMemo(() => ({ openTask, close }), [openTask, close])

  return (
    <TaskModalContext.Provider value={value}>
      {children}
      {taskId !== null && (
        <TaskDetailsModal
          isOpen={isOpen}
          onClose={close}
          taskId={taskId}
          onTaskUpdated={() => {}}
        />
      )}
    </TaskModalContext.Provider>
  )
}

