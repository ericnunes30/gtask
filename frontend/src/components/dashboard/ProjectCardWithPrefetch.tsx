import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Calendar, ArrowRight, AlertCircle } from 'lucide-react'
import { Project } from '@/utils/commonTypes'
import { useNavigate } from 'react-router-dom'
import { useHoverPrefetch } from '@/hooks/useDataPrefetching'

interface ProjectCardProps {
  project: Project
  className?: string
}

export const ProjectCardWithPrefetch: React.FC<ProjectCardProps> = ({ project, className }) => {
  const navigate = useNavigate()
  const { createHoverHandler } = useHoverPrefetch()

  const hoverHandlers = createHoverHandler('project', project.id)

  const handleCardClick = () => {
    navigate(`/project/${project.id}`)
  }

  // Calcular progresso do projeto
  const totalTasks = project.tasks?.length || 0
  const completedTasks = project.tasks?.filter((task: any) => task.status === 'completed').length || 0
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  // Determinar cor do badge de status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'pending': return 'bg-yellow-500'
      case 'completed': return 'bg-blue-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <Card
      {...hoverHandlers}
      className={`overflow-hidden hover:shadow-md hover:border-primary/50 transition-all cursor-pointer relative group ${className}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        {/* Header do Card */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                {project.name}
              </h3>
              {project.client && (
                <p className="text-sm text-muted-foreground">
                  {project.client}
                </p>
              )}
            </div>
            <Badge
              className={`${getStatusColor(project.status)} text-white text-xs`}
            >
              {project.status}
            </Badge>
          </div>

          {/* Descrição */}
          {project.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {project.description}
            </p>
          )}

          {/* Progresso */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {completedTasks} de {totalTasks} tarefas concluídas
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/50 px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Datas */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {project.startDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(project.startDate).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
              {project.endDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(project.endDate).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>

            {/* Equipe */}
            <div className="flex items-center gap-2">
              {project.team && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{project.team.name}</span>
                </div>
              )}

              {/* Avatar da equipe */}
              <div className="flex -space-x-2">
                {project.team?.members?.slice(0, 3).map((member: any, index: number) => (
                  <Avatar key={member.id || index} className="h-6 w-6 border-2 background">
                    <AvatarFallback className="text-xs">
                      {member.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {(project.team?.members?.length || 0) > 3 && (
                  <Avatar className="h-6 w-6 border-2 background">
                    <AvatarFallback className="text-xs">
                      +{project.team.members.length - 3}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>

              {/* Indicador de navegação */}
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>

          {/* Alerta de prazo próximo */}
          {project.endDate && new Date(project.endDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && project.status !== 'completed' && (
            <div className="mt-3 flex items-center gap-1 text-xs text-orange-600">
              <AlertCircle className="h-3 w-3" />
              <span>Prazo próximo</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}