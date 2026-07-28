import React from 'react'
import { useProjectModalStore } from '@/stores/projectModalStore'
import { ProjectDetailsModal } from '@/components/modals/ProjectDetailsModal'

interface ProjectModalProviderProps {
  children: React.ReactNode
}

export const ProjectModalProvider: React.FC<ProjectModalProviderProps> = ({ children }) => {
  const { isOpen, projectId, close } = useProjectModalStore()

  return (
    <>
      {children}
      {projectId !== null && (
        <ProjectDetailsModal
          isOpen={isOpen}
          onClose={close}
          projectId={projectId}
        />
      )}
    </>
  )
}
