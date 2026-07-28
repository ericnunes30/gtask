import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface ProjectModalState {
  isOpen: boolean
  projectId: number | null

  openProject: (projectId: number) => void
  close: () => void
}

export const useProjectModalStore = create<ProjectModalState>()(
  devtools(
    (set) => ({
      isOpen: false,
      projectId: null,

      openProject: (projectId: number) => {
        if (typeof projectId !== 'number' || Number.isNaN(projectId)) return
        set({ isOpen: true, projectId })
      },

      close: () => {
        set({ isOpen: false, projectId: null })
      }
    }),
    { name: 'project-modal-store' }
  )
)
