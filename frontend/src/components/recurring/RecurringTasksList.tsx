import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, AlertCircle, Edit, Trash2, Eye } from 'lucide-react'; // Adicionado Eye
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { RecurringTask, User } from '@/common/types';
import { useBackendServices } from '@/hooks/useBackendServices';
import { usePermissions } from '@/hooks/usePermissions';
import { RecurringTaskForm } from '@/components/forms/RecurringTaskForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function RecurringTasksList() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false); // Novo estado para o modal de visualização
  const [selectedTask, setSelectedTask] = useState<RecurringTask | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<number | null>(null);
  
  const permissions = usePermissions();
  const { recurringTasks: recurringTasksService, projects: projectsService, users: usersService } = useBackendServices();
  
  const { data: rawRecurringTasks = [], isLoading, isError } = recurringTasksService.useGetRecurringTasks();
  const { data: projects = [] } = projectsService.useGetProjects();
  const { data: users = [] } = usersService.useGetUsers(); // Buscar usuários
  const { mutateAsync: deleteRecurringTaskMutation } = recurringTasksService.useDeleteRecurringTask();

  const getUserName = (userId: number) => {
    const user = users.find((u: User) => u.id === userId);
    return user ? user.name : `ID ${userId}`;
  };

  const getScheduleDescription = (task: RecurringTask) => {
    const scheduleType = task.schedule_type;
    const frequencyInterval = task.frequency_interval;
    const frequencyCron = task.frequency_cron;

    if (scheduleType === 'interval') {
      if (frequencyInterval === '1 day') return 'Diariamente';
      if (frequencyInterval === '7 days') return 'Semanalmente';
      if (frequencyInterval === '1 month') return 'Mensalmente';
      return `Intervalo: ${frequencyInterval}`;
    }
    if (scheduleType === 'cron' && frequencyCron) {
      if (frequencyCron === '0 9 * * 1-5') return 'Diariamente (dias úteis)';
      
      const dayOfWeekMap: Record<string, string> = {
        '1': 'Segunda-feira', '2': 'Terça-feira', '3': 'Quarta-feira',
        '4': 'Quinta-feira', '5': 'Sexta-feira', '6': 'Sábado', '0': 'Domingo'
      };
      const dayOfWeekMatch = frequencyCron.match(/^0 9 \* \* (\d)$/);
      if (dayOfWeekMatch && dayOfWeekMatch[1] && dayOfWeekMap[dayOfWeekMatch[1]]) {
        return `Toda ${dayOfWeekMap[dayOfWeekMatch[1]]}`;
      }

      const dayOfMonthMatch = frequencyCron.match(/^0 9 (\d+|L) \* \*$/);
      if (dayOfMonthMatch && dayOfMonthMatch[1]) {
        if (dayOfMonthMatch[1] === 'L') return 'Mensalmente (Último dia)';
        return `Mensalmente (Dia ${dayOfMonthMatch[1]})`;
      }

      return `Avançado (${frequencyCron})`;
    }
    return 'N/A';
  };

  const getProjectName = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.title : 'Projeto não encontrado';
  };

  const handleProjectFilterChange = (value: string) => {
    if (value === 'all') {
      setSelectedProjectFilter(null);
    } else {
      setSelectedProjectFilter(Number(value));
    }
  };

  const recurringTasks = useMemo(() => {
    const tasksToFilter = Array.isArray(rawRecurringTasks?.data) ? rawRecurringTasks.data : [];
    if (selectedProjectFilter !== null) {
      return tasksToFilter.filter(task => task.projectId === selectedProjectFilter);
    }
    return tasksToFilter;
  }, [rawRecurringTasks, selectedProjectFilter]);

  const handleFormSuccess = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedTask(null);
  };

  const openViewDialog = (task: RecurringTask) => {
    setSelectedTask(task);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (task: RecurringTask) => {
    if (permissions.isMember) {
      toast.error('Você não tem permissão para editar regras de recorrência.');
      return;
    }
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (task: RecurringTask) => {
    if (permissions.isMember) {
      toast.error('Você não tem permissão para excluir regras de recorrência.');
      return;
    }
    setSelectedTask(task);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedTask) return;
    try {
      await deleteRecurringTaskMutation(selectedTask.id);
      toast.success('Regra de recorrência removida com sucesso!');
      setIsDeleteDialogOpen(false);
      setSelectedTask(null);
    } catch (error) {
      toast.error('Erro ao remover a regra de recorrência. Tente novamente.');
    }
  };

  return (
    <div className="flex flex-col gap-4 pt-4">
        <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Regras de Recorrência</h3>
            <div className="flex items-center gap-2">
                <Select
                    value={selectedProjectFilter ? String(selectedProjectFilter) : 'all'}
                    onValueChange={handleProjectFilterChange}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Todos os projetos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os projetos</SelectItem>
                        {projects
                            .sort((a, b) => a.title.localeCompare(b.title))
                            .map((project) => (
                            <SelectItem key={project.id} value={String(project.id)}>
                                {project.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {!permissions.isMember && (
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-1">
                        <PlusCircle className="h-4 w-4" />
                        Nova Regra
                        </Button>
                    </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                    <DialogTitle>Criar Nova Regra de Recorrência</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                    <RecurringTaskForm onSuccess={handleFormSuccess} />
                    </div>
                </DialogContent>
                </Dialog>
                )}
            </div>
        </div>

        {isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Erro ao carregar as regras de recorrência.</AlertDescription>
          </Alert>
        )}

        <div className="border rounded-lg w-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Projeto</TableHead>
                        <TableHead>Frequência</TableHead>
                        <TableHead>Próxima Execução</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={index}>
                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                        </TableRow>
                    ))
                ) : recurringTasks.length > 0 ? (
                    recurringTasks.map((task) => (
                    <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.name}</TableCell>
                        <TableCell className="text-sm">{getProjectName(task.projectId)}</TableCell>
                        <TableCell>{getScheduleDescription(task)}</TableCell>
                        <TableCell>{task.next_due_date ? format(new Date(task.next_due_date), 'PPP p', { locale: ptBR }) : 'N/A'}</TableCell>
                        <TableCell>
                            <Badge variant={task.is_active ? 'default' : 'outline'}>
                                {task.is_active ? 'Ativa' : 'Inativa'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                        {!permissions.isMember && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Abrir menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openViewDialog(task)}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        <span>Visualizar</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openEditDialog(task)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>Editar</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openDeleteDialog(task)} className="text-red-600">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Excluir</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            Nenhuma regra de recorrência encontrada.
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </div>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Regra de Recorrência</DialogTitle>
            <DialogDescription>{selectedTask?.name}</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Projeto</h4>
                  <p>{getProjectName(selectedTask.projectId)}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Status</h4>
                  <Badge variant={selectedTask.is_active ? 'default' : 'outline'}>
                    {selectedTask.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold">Frequência</h4>
                  <p>{getScheduleDescription(selectedTask)}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Próxima Execução</h4>
                  <p>{selectedTask.next_due_date ? format(new Date(selectedTask.next_due_date), 'PPP p', { locale: ptBR }) : 'N/A'}</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Dados do Template da Tarefa</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h5 className="font-medium">Título</h5>
                        <p>{selectedTask.templateData.title}</p>
                    </div>
                    <div>
                        <h5 className="font-medium">Prioridade</h5>
                        <p className="capitalize">{selectedTask.templateData.priority}</p>
                    </div>
                    <div className="col-span-2">
                        <h5 className="font-medium">Descrição</h5>
                        <p>{selectedTask.templateData.description || 'N/A'}</p>
                    </div>
                    <div>
                        <h5 className="font-medium">Responsáveis</h5>
                        <p>{selectedTask.templateData.assignee_ids?.map(id => getUserName(id)).join(', ') || 'N/A'}</p>
                    </div>
                    <div>
                        <h5 className="font-medium">Revisor</h5>
                        <p>{selectedTask.templateData.task_reviewer_id ? getUserName(selectedTask.templateData.task_reviewer_id) : 'N/A'}</p>
                    </div>
                    <div>
                        <h5 className="font-medium">Equipes</h5>
                        <p>{selectedTask.templateData.occupation_ids?.map(id => selectedTask.templateData.occupations?.find(o => o.id === id)?.name || `ID ${id}`).join(', ') || 'N/A'}</p>
                    </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Regra de Recorrência</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedTask && (
                <RecurringTaskForm 
                    recurringTaskId={selectedTask.id}
                    initialData={selectedTask} 
                    onSuccess={handleFormSuccess} 
                />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a regra
              de recorrência.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTask(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};