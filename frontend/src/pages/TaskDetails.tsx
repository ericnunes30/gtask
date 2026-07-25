import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Clock, Calendar, ChevronLeft, Edit, Trash2, AlertCircle, Eye } from 'lucide-react';
import { TaskForm } from '@/components/forms/TaskForm';
import { format, isBefore, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/adapters/AuthContextAdapter';
import { useBackendServices } from '@/hooks/useBackendServices';

const TaskDetails = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [comment, setComment] = useState('');

  const taskIdNum = taskId ? parseInt(taskId, 10) : NaN;

  // Hooks de autenticação e permissões
  const { user } = useAuth();
  const permissions = usePermissions();

  // Backend services
  const { tasks: tasksService, comments: commentsService, projects: projectsService } = useBackendServices();

  const { data: task, isLoading: isLoadingTask, isError: isTaskError } = tasksService.useGetTask(taskIdNum);
  const { mutateAsync: updateTask } = tasksService.useUpdateTask();
  const { mutateAsync: deleteTask } = tasksService.useDeleteTask();

  const { data: comments = [], isLoading: isLoadingComments } = commentsService.useGetCommentsByTask(taskIdNum);
  const { mutateAsync: createComment, isPending: isCreatingComment } = commentsService.useCreateComment();

  const { data: project } = projectsService.useGetProject(task?.project_id);

  useEffect(() => {
    if (isTaskError || isNaN(taskIdNum)) {
      navigate('/tasks');
      toast({
        title: 'Tarefa não encontrada',
        description: 'A tarefa solicitada não existe ou foi removida.',
        variant: 'destructive',
      });
    }
  }, [isTaskError, taskIdNum, navigate]);

  const handleBackClick = () => {
    navigate('/tasks');
  };

  const handleEditTask = async (updatedTask: any) => {
    if (!task || isNaN(taskIdNum)) return;
    await updateTask({ id: taskIdNum, data: updatedTask });
    setIsEditSheetOpen(false);
    toast({
      title: 'Tarefa atualizada',
      description: 'As alterações foram salvas com sucesso.',
    });
  };

  const handleDeleteTask = async () => {
    if (isNaN(taskIdNum)) return;
    await deleteTask(taskIdNum);
    setIsDeleteDialogOpen(false);
    navigate('/tasks');
    toast({
      title: 'Tarefa excluída',
      description: 'A tarefa foi removida permanentemente.',
    });
  };

  const handleToggleComplete = async () => {
    if (!task || isNaN(taskIdNum)) return;
    const newStatus = task.status === 'concluido' ? 'a_fazer' : 'concluido';
    await updateTask({ id: taskIdNum, data: { status: newStatus } });
    toast({
      title: newStatus === 'concluido' ? 'Tarefa concluída' : 'Tarefa reaberta',
      description: newStatus === 'concluido'
        ? 'A tarefa foi marcada como concluída.'
        : 'A tarefa foi marcada como pendente.',
    });
  };

  const handleAddComment = async () => {
    if (!comment.trim() || isNaN(taskIdNum)) return;
    await createComment({ content: comment, task_id: taskIdNum });
    setComment('');
    toast({
      title: 'Comentário adicionado',
      description: 'Seu comentário foi adicionado com sucesso.',
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatPriority = (priority: string) => {
    switch (priority) {
      case 'high':
        return { label: 'Alta', variant: 'destructive' as const };
      case 'medium':
        return { label: 'Média', variant: 'default' as const };
      case 'low':
        return { label: 'Baixa', variant: 'secondary' as const };
      default:
        return { label: 'Média', variant: 'default' as const };
    }
  };

  const getDueDateStatus = (dueDate: string) => {
    if (!dueDate) return null as any;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateObj = new Date(dueDate);

    // Se a data já passou
    if (isPast(dueDateObj) && dueDateObj.getDate() !== today.getDate()) {
      return {
        label: 'Atrasada',
        variant: 'destructive' as const,
        icon: <AlertCircle className="h-4 w-4 mr-1" />,
      };
    }

    // Se a data é hoje
    if (
      dueDateObj.getDate() === today.getDate() &&
      dueDateObj.getMonth() === today.getMonth() &&
      dueDateObj.getFullYear() === today.getFullYear()
    ) {
      return {
        label: 'Hoje',
        variant: 'default' as const,
        icon: <Clock className="h-4 w-4 mr-1" />,
      };
    }

    // Se a data é nos próximos 3 dias
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    if (isBefore(dueDateObj, threeDaysLater)) {
      return {
        label: 'Em breve',
        variant: 'secondary' as const,
        icon: <Clock className="h-4 w-4 mr-1" />,
      };
    }

    // Caso contrário, está no prazo
    return {
      label: 'No prazo',
      variant: 'outline' as const,
      icon: <Calendar className="h-4 w-4 mr-1" />,
    };
  };

  if (isLoadingTask || !task) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p>Carregando...</p>
        </div>
      </AppLayout>
    );
  }

  const isCompleted = task.status === 'concluido';
  const priorityInfo = formatPriority(task.priority);
  const dueDateStatus = (task.dueDate || task.due_date) ? getDueDateStatus(task.dueDate || task.due_date) : null;

  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        {/* Barra superior com ações, alinhado ao tema */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" className="gap-1" onClick={handleBackClick}>
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>

          <div className="flex gap-2">
            {permissions.isMember ? (
              <Button variant="outline" size="sm" className="gap-1" disabled>
                <Eye className="h-4 w-4" />
                Visualizando
              </Button>
            ) : (
              <>
                <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Editar Tarefa</SheetTitle>
                      <SheetDescription>
                        Faça alterações na tarefa e clique em salvar quando terminar.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="py-4">
                      <TaskForm initialData={task} onSuccess={handleEditTask} isEditMode={true} />
                    </div>
                    <SheetFooter className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => setIsEditSheetOpen(false)}>
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          const submitButton = document.getElementById('task-form-submit');
                          if (submitButton) {
                            (submitButton as HTMLButtonElement).click();
                          } else {
                            console.error('Botão de submit não encontrado');
                          }
                        }}
                      >
                        Salvar Alterações
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>

                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-1">
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Excluir Tarefa</DialogTitle>
                      <DialogDescription>
                        Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center bg-destructive/10 p-3 rounded-md mt-2">
                      <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
                      <p className="text-sm">Todos os dados relacionados a esta tarefa serão perdidos.</p>
                    </div>
                    <DialogFooter className="flex justify-between">
                      <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteTask}>
                        Excluir
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Container dividido em 2 painéis, espelhando o modal */}
        <Card className="overflow-hidden">
          <div className="flex flex-col lg:flex-row h-full">
            {/* Painel esquerdo: detalhes */}
            <div className="lg:w-1/2 border-b lg:border-b-0 lg:border-r p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Checkbox id="task-complete" checked={isCompleted} onCheckedChange={handleToggleComplete} />
                    <CardTitle className={isCompleted ? 'line-through text-muted-foreground' : ''}>{task.title}</CardTitle>
                  </div>
                  <CardDescription className="mt-2 text-muted-foreground">
                    {project ? `Projeto: ${project.title || project.name}` : 'Sem projeto associado'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>
                  {dueDateStatus && (
                    <Badge variant={dueDateStatus.variant} className="flex items-center">
                      {dueDateStatus.icon}
                      {dueDateStatus.label}
                    </Badge>
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Descrição</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{task.description || 'Sem descrição.'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Datas</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>Criada em: {formatDate(task.createdAt || task.created_at)}</span>
                      </div>
                      {(task.dueDate || task.due_date) && (
                        <div className="flex items-center text-sm">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>Prazo: {formatDate(task.dueDate || task.due_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Status</h3>
                    <Badge variant={isCompleted ? 'default' : 'outline'}>{isCompleted ? 'Concluída' : 'Pendente'}</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Painel direito: atividade */}
            <div className="lg:w-1/2 p-6">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-base">Atividade</CardTitle>
                <Tabs defaultValue="all" className="w-auto">
                  <TabsList>
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="comments">Comentários</TabsTrigger>
                    <TabsTrigger value="history" disabled>Histórico</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <Separator className="mb-4" />
              <div className="space-y-4">
                {comments.length > 0 ? (
                  comments.map((c) => (
                    <div key={c.id} className="border rounded-md p-3">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{c.user?.name || 'Usuário'}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="text-sm mt-1">{c.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-6">Nenhuma atividade registrada ainda. Seja o primeiro a comentar!</p>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Escreva um comentário"
                  className="min-h-[80px]"
                />
                <Button onClick={handleAddComment} className="self-end" disabled={!comment.trim() || isCreatingComment || isLoadingComments}>
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default TaskDetails;
