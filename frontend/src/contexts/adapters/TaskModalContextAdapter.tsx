import { useTaskModalStore } from '@/stores/taskModalStore'

// Hook adaptador para manter a mesma API do TaskModalContext
export const useTaskModal = () => {
  const { openTask, close } = useTaskModalStore()

  return {
    openTask,
    close
  }
}