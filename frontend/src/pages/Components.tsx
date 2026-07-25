import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ProjectsList } from '@/components/dashboard/ProjectsList';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { TaskForm } from '@/components/forms/TaskForm';
import { ProjectForm } from '@/components/forms/ProjectForm';
import { RecurringTaskForm } from '@/components/forms/RecurringTaskForm';

// Componentes UI mais usados
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';

// Ícones do lucide-react
import { 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Briefcase, 
  ListChecks, 
  Calendar,
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  Clock,
  User,
  Filter,
  Search,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Save,
  BarChart3,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Ban
} from 'lucide-react';

const Components: React.FC = () => {
  const [activeTab, setActiveTab] = useState('buttons');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(false);
  const [progressValue, setProgressValue] = useState(75);
  const [selectValue, setSelectValue] = useState('');

  // Dados de exemplo para os componentes
  const mockTasks = [
    { id: 1, title: 'Tarefa de Exemplo 1', status: 'pending', priority: 'high', assignee: 'João Silva' },
    { id: 2, title: 'Tarefa de Exemplo 2', status: 'in_progress', priority: 'medium', assignee: 'Maria Santos' },
    { id: 3, title: 'Tarefa de Exemplo 3', status: 'completed', priority: 'low', assignee: 'Pedro Oliveira' }
  ];

  const mockProjects = [
    { id: 1, name: 'Projeto Alpha', description: 'Descrição do projeto Alpha', status: 'active', progress: 75 },
    { id: 2, name: 'Projeto Beta', description: 'Descrição do projeto Beta', status: 'pending', progress: 30 },
    { id: 3, name: 'Projeto Gamma', description: 'Descrição do projeto Gamma', status: 'completed', progress: 100 }
  ];

  const mockStats = [
    { title: 'Total de Tarefas', value: '156', icon: ListChecks, trend: 'up', trendValue: '+12%' },
    { title: 'Projetos Ativos', value: '8', icon: Briefcase, trend: 'up', trendValue: '+2%' },
    { title: 'Membros da Equipe', value: '24', icon: Users, trend: 'down', trendValue: '-1%' },
    { title: 'Tarefas Concluídas', value: '89', icon: CheckCircle2, trend: 'up', trendValue: '+5%' }
  ];

  const kanbanColumns = [
    { id: 'pending', title: 'Pendente', tasks: mockTasks.filter(t => t.status === 'pending') },
    { id: 'in_progress', title: 'Em Progresso', tasks: mockTasks.filter(t => t.status === 'in_progress') },
    { id: 'completed', title: 'Concluído', tasks: mockTasks.filter(t => t.status === 'completed') }
  ];

  const showToast = () => {
    toast({
      title: "Exemplo de Toast",
      description: "Esta é uma notificação toast de exemplo.",
    });
  };

  const ComponentSection = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Componentes da Aplicação</h1>
        <p className="text-muted-foreground">
          Visualização de todos os componentes reais utilizados na aplicação Manager Group
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 w-full">
          <TabsTrigger value="buttons">Botões</TabsTrigger>
          <TabsTrigger value="forms">Formulários</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="data">Dados</TabsTrigger>
          <TabsTrigger value="overlay">Overlay</TabsTrigger>
          <TabsTrigger value="custom">Customizados</TabsTrigger>
        </TabsList>

        <TabsContent value="buttons" className="space-y-4">
          <ComponentSection title="Botões de Ação" description="Botões utilizados para ações principais">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => alert('Botão clicado!')}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
              <Button variant="outline" onClick={() => alert('Editar!')}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button variant="destructive" onClick={() => alert('Excluir!')}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
              <Button variant="secondary" onClick={() => alert('Visualizar!')}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </Button>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Pequeno</Button>
              <Button size="default">Padrão</Button>
              <Button size="lg">Grande</Button>
            </div>
          </ComponentSection>

          <ComponentSection title="Botões de Estado" description="Botões para diferentes estados">
            <div className="flex flex-wrap gap-2">
              <Button disabled>
                <Clock className="h-4 w-4 mr-2" />
                Processando...
              </Button>
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
              <Button variant="outline">
                <Ban className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </ComponentSection>
        </TabsContent>

        <TabsContent value="forms" className="space-y-4">
          <ComponentSection title="Formulário de Tarefa" description="Componentes do formulário de tarefa">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Título da Tarefa</Label>
                <Input id="task-title" placeholder="Digite o título da tarefa..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-description">Descrição</Label>
                <Textarea id="task-description" placeholder="Descreva a tarefa..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-priority">Prioridade</Label>
                  <Select value={selectValue} onValueChange={setSelectValue}>
                    <SelectTrigger id="task-priority">
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-status">Status</Label>
                  <Select>
                    <SelectTrigger id="task-status">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in_progress">Em Progresso</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="task-recurring" />
                <Label htmlFor="task-recurring">Tarefa Recorrente</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="task-active" 
                  checked={switchChecked} 
                  onCheckedChange={setSwitchChecked} 
                />
                <Label htmlFor="task-active">Ativo</Label>
              </div>
            </div>
          </ComponentSection>

          <ComponentSection title="Formulário de Projeto" description="Componentes do formulário de projeto">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Nome do Projeto</Label>
                <Input id="project-name" placeholder="Digite o nome do projeto..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-description">Descrição</Label>
                <Textarea id="project-description" placeholder="Descreva o projeto..." rows={3} />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="project-public" />
                <Label htmlFor="project-public">Projeto Público</Label>
              </div>
            </div>
          </ComponentSection>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <ComponentSection title="Alertas" description="Mensagens de feedback para o usuário">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Informação</AlertTitle>
              <AlertDescription>
                Esta é uma mensagem informativa. Use para comunicações importantes.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>
                Esta é uma mensagem de erro. Use para indicar falhas ou problemas.
              </AlertDescription>
            </Alert>
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Sucesso</AlertTitle>
              <AlertDescription className="text-green-700">
                Esta é uma mensagem de sucesso. Use para confirmar ações bem-sucedidas.
              </AlertDescription>
            </Alert>
          </ComponentSection>

          <ComponentSection title="Progresso" description="Indicadores de progresso">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Progresso do Projeto</Label>
                  <span>{progressValue}%</span>
                </div>
                <Progress value={progressValue} className="w-full" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setProgressValue(Math.max(0, progressValue - 10))}>
                  <Minus className="h-3 w-3" />
                </Button>
                <Button size="sm" onClick={() => setProgressValue(Math.min(100, progressValue + 10))}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </ComponentSection>

          <ComponentSection title="Notificações Toast" description="Notificações temporárias">
            <Button onClick={showToast}>
              <AlertCircle className="h-4 w-4 mr-2" />
              Mostrar Toast
            </Button>
          </ComponentSection>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <ComponentSection title="Badges" description="Etiquetas para categorizar informações">
            <div className="flex flex-wrap gap-2">
              <Badge>Status: Pendente</Badge>
              <Badge variant="secondary">Prioridade: Média</Badge>
              <Badge variant="destructive">Urgente</Badge>
              <Badge variant="outline">Categoria: Desenvolvimento</Badge>
              <Badge className="bg-green-100 text-green-800">Concluído</Badge>
              <Badge className="bg-yellow-100 text-yellow-800">Em Progresso</Badge>
              <Badge className="bg-blue-100 text-blue-800">Novo</Badge>
            </div>
          </ComponentSection>

          <ComponentSection title="Avatares" description="Representação visual de usuários">
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>AB</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </div>
          </ComponentSection>

          <ComponentSection title="Skeletons" description="Estados de carregamento">
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          </ComponentSection>

          <ComponentSection title="Separadores" description="Divisores visuais">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium">Seção 1</h4>
                <Separator className="my-2" />
                <p className="text-sm text-muted-foreground">Conteúdo da seção 1</p>
              </div>
              <div>
                <h4 className="text-sm font-medium">Seção 2</h4>
                <Separator className="my-2" orientation="horizontal" />
                <p className="text-sm text-muted-foreground">Conteúdo da seção 2</p>
              </div>
            </div>
          </ComponentSection>
        </TabsContent>

        <TabsContent value="overlay" className="space-y-4">
          <ComponentSection title="Diálogos" description="Janelas modais para ações importantes">
            <div className="flex flex-wrap gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Abrir Diálogo</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar Ação</DialogTitle>
                    <DialogDescription>
                      Tem certeza de que deseja executar esta ação? Esta ação não pode ser desfeita.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => setIsDialogOpen(false)}>
                      Confirmar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Abrir Alerta</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente o item.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction>Continuar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </ComponentSection>

          <ComponentSection title="Sheets" description="Painéis laterais para conteúdo adicional">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">Abrir Sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Detalhes do Item</SheetTitle>
                  <SheetDescription>
                    Visualize e edite as informações do item selecionado.
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input placeholder="Nome do item" />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea placeholder="Descrição do item" rows={3} />
                  </div>
                </div>
                <SheetFooter>
                  <Button variant="outline" onClick={() => setIsSheetOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setIsSheetOpen(false)}>
                    Salvar
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </ComponentSection>

          <ComponentSection title="Popovers" description="Dicas contextuais e menus">
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline">Abrir Popover</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium">Ações Rápidas</h4>
                  <p className="text-sm text-muted-foreground">
                    Selecione uma ação para executar.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline">
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-3 w-3 mr-1" />
                      Baixar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </ComponentSection>

          <ComponentSection title="Tooltips" description="Dicas informativas ao passar o mouse">
            <TooltipProvider>
              <div className="flex flex-wrap gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Esta é uma dica informativa.</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">
                      Passe o mouse aqui
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mais informações sobre este botão.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </ComponentSection>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <ComponentSection title="Dashboard Stats" description="Componentes de estatísticas do dashboard">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {mockStats.map((stat, index) => {
                const Icon = stat.icon;
                const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
                return (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.title}
                      </CardTitle>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className={`flex items-center text-xs ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        <TrendIcon className="h-3 w-3 mr-1" />
                        {stat.trendValue}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ComponentSection>

          <ComponentSection title="Listas de Projetos" description="Componente de lista de projetos">
            <div className="space-y-4">
              {mockProjects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Badge 
                        variant={project.status === 'active' ? 'default' : 
                               project.status === 'completed' ? 'secondary' : 'outline'}
                      >
                        {project.status === 'active' ? 'Ativo' : 
                         project.status === 'completed' ? 'Concluído' : 'Pendente'}
                      </Badge>
                    </div>
                    <CardDescription>{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progresso</span>
                        <span>{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ComponentSection>

          <ComponentSection title="Formulários Customizados" description="Formulários específicos da aplicação">
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Formulário de Tarefa</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Componente TaskForm usado para criar e editar tarefas
                </p>
                <div className="bg-muted p-4 rounded-md">
                  <code className="text-sm">
                    {`<TaskForm />`}
                  </code>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Formulário de Projeto</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Componente ProjectForm usado para criar e editar projetos
                </p>
                <div className="bg-muted p-4 rounded-md">
                  <code className="text-sm">
                    {`<ProjectForm />`}
                  </code>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Layout da Aplicação</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Componente AppLayout usado como estrutura principal das páginas
                </p>
                <div className="bg-muted p-4 rounded-md">
                  <code className="text-sm">
                    {`<AppLayout>\n  <SuaPagina />\n</AppLayout>`}
                  </code>
                </div>
              </div>
            </div>
          </ComponentSection>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Components;