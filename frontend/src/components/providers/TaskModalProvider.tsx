import React, { useEffect } from 'react'
import { useTaskModalStore } from '@/stores/taskModalStore'
import TaskDetailsModal from '@/components/tasks/TaskDetailsModal'

interface TaskModalProviderProps {
  children: React.ReactNode
}

export const TaskModalProvider: React.FC<TaskModalProviderProps> = ({ children }) => {
  const { isOpen, taskId, close } = useTaskModalStore()

  return (
    <>
      {children}
      {taskId !== null && (
        <TaskDetailsModal
          isOpen={isOpen}
          onClose={close}
          taskId={taskId}
          onTaskUpdated={() => {}}
        />
      )}
    </>
  )
}