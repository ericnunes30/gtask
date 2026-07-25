
import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, CheckCircle2, ListTodo, Clock, ArrowUpRight, TrendingUp } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { useBackendServices } from '@/hooks/useBackendServices';
import { cn } from '@/utils/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: string;
  loading?: boolean;
  color?: string;
}

const StatCard = ({ title, value, description, icon: Icon, trend, loading, color = "primary" }: StatCardProps) => {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    rose: "bg-rose-500/10 text-rose-600",
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{title}</span>
              <div className={cn("p-2 rounded-lg", colorClasses[color as keyof typeof colorClasses] || colorClasses.primary)}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">{value}</span>
              {trend && (
                <span className="text-xs font-medium text-emerald-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  {trend}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const DashboardStats = () => {
  const { projects: projectsService, tasks: tasksService } = useBackendServices();
  const { data: projects = [], isLoading: projectsLoading } = projectsService.useGetProjects();
  const { data: tasks = [], isLoading: tasksLoading } = tasksService.useGetTasks();

  const stats = useMemo(() => {
    if (projectsLoading || tasksLoading) {
      return {
        activeProjects: 0,
        newProjects: 0,
        pendingTasks: 0,
        urgentTasks: 0,
        completedTasks: 0,
        todayCompletedTasks: 0,
        totalHours: 0,
        todayHours: 0,
      };
    }

    const activeProjects = projects.filter(project => project.status).length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newProjects = projects.filter(project => {
      if (!project.created_at && !project.createdAt) return false;
      const createdDate = new Date(project.created_at || project.createdAt || '');
      return !isNaN(createdDate.getTime()) && createdDate > thirtyDaysAgo;
    }).length;

    const pendingTasks = tasks.filter(
      task => task.status === 'a_fazer' || task.status === 'pendente'
    ).length;

    const urgentTasks = tasks.filter(
      task => task.priority === 'alta' || task.priority === 'urgente'
    ).length;

    const completedTasks = tasks.filter(task => task.status === 'concluido').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCompletedTasks = tasks.filter(task => {
      if (task.status !== 'concluido') return false;
      if (!task.updated_at && !task.updatedAt) return false;
      const updatedDate = new Date(task.updated_at || task.updatedAt || '');
      return !isNaN(updatedDate.getTime()) && updatedDate > today;
    }).length;

    const totalHours = tasks.length * 3;
    const todayHours = Math.floor(Math.random() * 10);

    return {
      activeProjects,
      newProjects,
      pendingTasks,
      urgentTasks,
      completedTasks,
      todayCompletedTasks,
      totalHours,
      todayHours,
    };
  }, [projects, tasks, projectsLoading, tasksLoading]);

  const isLoading = projectsLoading || tasksLoading;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Projetos Ativos"
        value={stats.activeProjects}
        description={`+${stats.newProjects} novos neste mês`}
        icon={Briefcase}
        loading={isLoading}
        color="primary"
      />
      <StatCard
        title="Tarefas Pendentes"
        value={stats.pendingTasks}
        description={`${stats.urgentTasks} com prioridade alta`}
        icon={ListTodo}
        loading={isLoading}
        color="amber"
      />
      <StatCard
        title="Concluídas"
        value={stats.completedTasks}
        description={`+${stats.todayCompletedTasks} hoje`}
        icon={CheckCircle2}
        loading={isLoading}
        color="emerald"
      />
      <StatCard
        title="Horas Trabalhadas"
        value={`${stats.totalHours}h`}
        description={`+${stats.todayHours} desde ontem`}
        icon={Clock}
        loading={isLoading}
        color="rose"
      />
    </div>
  );
};
