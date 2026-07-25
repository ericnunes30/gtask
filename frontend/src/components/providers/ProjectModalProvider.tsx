import React from 'react'
import { useProjectModalStore } from '@/stores/projectModalStore'

interface ProjectModalProviderProps {
  children: React.ReactNode
}

export const ProjectModalProvider: React.FC<ProjectModalProviderProps> = ({ children }) => {
  const { isOpen, projectId, close } = useProjectModalStore()

  return (
    <>
      {children}
      {projectId !== null && (
        <div>
          {/* TODO: render ProjectViewModal here once component is ready */}
          Modal placeholder for project {projectId} (open: {String(isOpen)})
          <button onClick={close}>Close</button>
        </div>
      )}
    </>
  )
}
