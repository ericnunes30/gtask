
import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ProjectsList } from '@/components/dashboard/ProjectsList';
import { TasksList } from '@/components/dashboard/TasksList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Sparkles, ListTodo, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <Sparkles className="h-5 w-5 text-primary/60" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Bem-vindo ao seu painel de gerenciamento de projetos e tarefas.
            </p>
          </div>
          <Button
            className="gap-2 rounded-xl shadow-sm"
            onClick={() => navigate('/projects')}
          >
            <PlusCircle className="h-4 w-4" />
            Novo Projeto
          </Button>
        </div>

        <DashboardStats />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg text-xs">Visão Geral</TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-lg text-xs">Minhas Tarefas</TabsTrigger>
            <TabsTrigger value="projects" className="rounded-lg text-xs">Meus Projetos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ProjectsList />
              </div>
              <div>
                <TasksList />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="tasks" className="mt-4">
            <div className="bg-white rounded-2xl border shadow-sm p-8">
              <div className="text-center">
                <ListTodo className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">Minhas Tarefas</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                  Visualize e gerencie todas as suas tarefas pendentes.
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="projects" className="mt-4">
            <div className="bg-white rounded-2xl border shadow-sm p-8">
              <div className="text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">Meus Projetos</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                  Acompanhe todos os projetos que você está participando.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Index;
