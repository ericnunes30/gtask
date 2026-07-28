import React, { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClipboardList, Users, Calendar, X } from 'lucide-react'
import { useProjectModalStore } from '@/stores/projectModalStore'
import { useBackendServices } from '@/hooks/useBackendServices'
import { Project } from '@/utils/commonTypes'

interface ProjectDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: number
}

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  isOpen,
  onClose,
  projectId,
}) => {
  const { projects } = useBackendServices()
  const { data: projectData, isLoading, isError } = projects.useGetProject(projectId, isOpen)

  const project = projectData as Project | undefined

  const progress = useMemo(() => {
    if (!project?.tasks?.length) return 0
    const completed = project.tasks.filter((t) => t.status === 'concluido').length
    return Math.round((completed / project.tasks.length) * 100)
  }, [project?.tasks])

  const users = useMemo(() => {
    if (!project?.users?.length) return []
    return project.users
      .map((u) => (typeof u === 'object' ? u : { id: u, name: `Usuário ${u}`, email: '' }))
      .filter((u): u is { id: number; name: string; email: string } => typeof u.id === 'number')
  }, [project?.users])

  const tasksByStatus = useMemo(() => {
    if (!project?.tasks?.length) return {}
    return project.tasks.reduce(
      (acc: Record<string, number>, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
  }, [project?.tasks])

  const formatDate = (value?: string) => {
    if (!value) return 'Não especificado'
    try {
      return new Date(value).toLocaleDateString('pt-BR')
    } catch {
      return value
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto p-0">
        {isLoading && (
          <div className="p-6 space-y-4">
            <div className="h-6 w-1/3 bg-muted rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
            <div className="h-32 bg-muted rounded animate-pulse" />
          </div>
        )}

        {isError && (
          <div className="p-6">
            <p className="text-destructive">Erro ao carregar o projeto. Tente novamente.</p>
            <DialogFooter className="mt-4">
              <Button onClick={onClose} variant="outline">Fechar</Button>
            </DialogFooter>
          </div>
        )}

        {project && (
          <>
            <DialogHeader className="p-6 pb-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-xl">{project.title}</DialogTitle>
                  <DialogDescription className="mt-1">
                    Projeto criado em {formatDate(project.createdAt || project.created_at)}
                  </DialogDescription>
                </div>
                <Badge variant={project.status ? 'default' : 'secondary'} className="shrink-0">
                  {project.status ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {/* Progresso */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso das tarefas</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {project.tasks?.length || 0} tarefas no total
                  {progress > 0 && ` · ${project.tasks?.filter((t) => t.status === 'concluido').length || 0} concluídas`}
                </p>
              </div>

              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="members">Membros</TabsTrigger>
                  <TabsTrigger value="tasks">Tarefas</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 pt-4">
                  {project.description && (
                    <div className="border border-border/60 bg-muted/20 p-4 rounded-md">
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <ClipboardList className="h-4 w-4 mr-2 text-muted-foreground" />
                        Descrição
                      </h4>
                      <div
                        className="text-sm leading-relaxed prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: project.description }}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-border/60 bg-muted/10 p-4 rounded-md">
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        Período
                      </h4>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Início:</span> {formatDate(project.start_date || project.startDate)}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Término:</span> {formatDate(project.end_date || project.endDate)}
                      </p>
                    </div>

                    <div className="border border-border/60 bg-muted/10 p-4 rounded-md">
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                        Equipes
                      </h4>
                      {project.occupations && project.occupations.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {project.occupations.map((occupation) => (
                            <Badge key={occupation.id} variant="secondary">
                              {occupation.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma equipe associada.</p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="members" className="pt-4">
                  {users.length > 0 ? (
                    <div className="space-y-2">
                      {users.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-2 border border-border/40 bg-background rounded-md"
                        >
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarFallback>
                                {member.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum membro adicionado a este projeto.</p>
                  )}
                </TabsContent>

                <TabsContent value="tasks" className="pt-4">
                  {project.tasks && project.tasks.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(tasksByStatus).map(([status, count]) => (
                          <div key={status} className="border border-border/60 bg-muted/10 p-2 rounded-md text-center">
                            <p className="text-xs text-muted-foreground uppercase">{status.replace('_', ' ')}</p>
                            <p className="text-lg font-semibold">{count}</p>
                          </div>
                        ))}
                      </div>

                      <div className="border border-border/60 rounded-md overflow-hidden">
                        <div className="bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground uppercase">
                          Últimas tarefas
                        </div>
                        <div className="divide-y divide-border">
                          {project.tasks.slice(0, 5).map((task) => (
                            <div key={task.id} className="px-4 py-3 flex items-center justify-between">
                              <span className="text-sm truncate">{task.title}</span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {task.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          ))}
                          {project.tasks.length > 5 && (
                            <p className="px-4 py-2 text-xs text-center text-muted-foreground">
                              + {project.tasks.length - 5} tarefas
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa neste projeto.</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="p-6 pt-0">
              <Button onClick={onClose} variant="outline" className="gap-2">
                <X className="h-4 w-4" />
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
