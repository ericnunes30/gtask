import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface TaskModalState {
  isOpen: boolean
  taskId: number | null

  // Ações
  openTask: (taskId: number) => void
  close: () => void
}

export const useTaskModalStore = create<TaskModalState>()(
  devtools(
    (set) => ({
      // Estado inicial
      isOpen: false,
      taskId: null,

      // Ações
      openTask: (taskId) => {
        if (typeof taskId !== 'number' || Number.isNaN(taskId)) return
        set({ isOpen: true, taskId })
      },

      close: () => {
        set({ isOpen: false, taskId: null })
      }
    }),
    { name: 'task-modal-store' }
  )
)