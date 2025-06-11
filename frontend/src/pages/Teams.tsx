import React, { useState, useMemo } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, Briefcase, AlertCircle, UserPlus, Pencil, Trash2, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Occupation, UserOccupation, User } from '@/common/types';
import { useGetUsers } from '@/services/backend/users';
import {
  useGetOccupations,
  useCreateOccupation,
  useUpdateOccupation,
  useDeleteOccupation,
} from '@/services/backend/occupations';

const OccupationsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [occupationName, setOccupationName] = useState('');
  const [selectedOccupationIdForUser, setSelectedOccupationIdForUser] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [editingOccupation, setEditingOccupation] = useState<Occupation | null>(null);
  const [occupationToDelete, setOccupationToDelete] = useState<Occupation | null>(null);

  const {
    data: allOccupations = [],
    isLoading: occupationsLoading,
    isError: occupationsIsError,
    error: occupationsError, // Renomeado de teamsError para occupationsError
    refetch: refetchOccupations, // Renomeado de refetchTeams para refetchOccupations
  } = useGetOccupations();

  const { mutateAsync: createOccupationMutate } = useCreateOccupation();
  const { mutateAsync: updateOccupationMutate } = useUpdateOccupation();
  const { mutateAsync: deleteOccupationMutate } = useDeleteOccupation();
  const { data: usersQueryData = [] } = useGetUsers();

  // Since the API endpoint doesn't exist, we'll derive occupation users from the main occupation data
  const derivedOccupationUsers = React.useMemo(() => {
    const map: Record<number, User[]> = {};
    if (Array.isArray(allOccupations)) {
      allOccupations.forEach((occupation) => {
        // Use the users preloaded in the occupation data
        map[occupation.id] = occupation.users || [];
      });
    }
    return map;
  }, [allOccupations]);

  const loading = occupationsLoading;
  const error = occupationsIsError ? 'Não foi possível carregar as ocupações.' : (occupationsError as any)?.message || null;


  const handleAddOccupation = async () => {
    if (!occupationName.trim()) {
      toast.error('O nome da ocupação é obrigatório');
      return;
    }
    try {
      await createOccupationMutate({ name: occupationName, description: '' });
      setOccupationName('');
      setIsDialogOpen(false);
      toast.success('Ocupação criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['occupations'] });
      queryClient.invalidateQueries({ queryKey: ['occupationUsers'] });
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível criar a ocupação. Tente novamente.');
    }
  };

  // Commented out as backend API doesn't support these operations
  // const handleAddUserToOccupation = async () => {
  //   if (!selectedUserId || !selectedOccupationIdForUser) {
  //     toast.error('Por favor, selecione um usuário e uma ocupação');
  //     return;
  //   }
  //   try {
  //     const userId = parseInt(selectedUserId);
  //     const occupationId = selectedOccupationIdForUser;
  //     await addUserToOccupationMutate({
  //       occupationId: occupationId,
  //       userId: userId,
  //     });
  //     setSelectedUserId('');
  //     setAddUserDialogOpen(false);
  //     setSelectedOccupationIdForUser(null);
  //     toast.success('Usuário adicionado à ocupação com sucesso!');
  //     queryClient.invalidateQueries({ queryKey: ['occupationUsers', occupationId] });
  //   } catch (err) {
  //     toast.error((err as Error).message || 'Não foi possível adicionar o usuário à ocupação. Tente novamente.');
  //   }
  // };

  // const handleRemoveUserFromOccupation = async (occupationId: number, userId: number) => {
  //   if (!confirm('Tem certeza que deseja remover este usuário da ocupação?')) {
  //     return;
  //   }
  //   try {
  //     await removeUserFromOccupationMutate({ occupationId, userId });
  //     toast.success('Usuário removido da ocupação com sucesso!');
  //     queryClient.invalidateQueries({ queryKey: ['occupationUsers', occupationId] });
  //   } catch (err) {
  //     toast.error((err as Error).message || 'Não foi possível remover o usuário da ocupação. Tente novamente.');
  //   }
  // };

  const handleEditOccupationStart = (occupation: Occupation) => {
    setEditingOccupation(occupation);
    setOccupationName(occupation.name);
    setIsEditDialogOpen(true);
  };

  const handleDeleteOccupation = (occupation: Occupation) => {
    setOccupationToDelete(occupation);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteOccupationConfirm = async () => {
    if (!occupationToDelete) return;
    try {
      await deleteOccupationMutate(occupationToDelete.id);
      setIsDeleteDialogOpen(false);
      setOccupationToDelete(null);
      toast.success(`Ocupação ${occupationToDelete.name} removida com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['occupations'] });
      queryClient.invalidateQueries({ queryKey: ['occupationUsers'] });
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível excluir a ocupação. Tente novamente.');
    }
  };

  const handleEditOccupationSave = async () => {
    if (!editingOccupation || !occupationName.trim()) {
      toast.error('O nome da ocupação é obrigatório');
      return;
    }
    try {
      await updateOccupationMutate({ id: editingOccupation.id, data: { name: occupationName, description: editingOccupation.description || '' } });
      setOccupationName('');
      setEditingOccupation(null);
      setIsEditDialogOpen(false);
      toast.success('Ocupação atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['occupations'] });
      queryClient.invalidateQueries({ queryKey: ['occupationUsers'] });
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível atualizar a ocupação. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="p-4">
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ocupações</h1>
            <p className="text-muted-foreground">
              Gerencie suas ocupações e atribua usuários.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <PlusCircle className="h-4 w-4" />
                Nova Ocupação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Nova Ocupação</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes da ocupação. Clique em salvar quando terminar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    value={occupationName}
                    onChange={(e) => setOccupationName(e.target.value)}
                    className="col-span-3"
                    placeholder="Nome da ocupação"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddOccupation}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Editar Ocupação</DialogTitle>
                <DialogDescription>
                  Atualize os detalhes da ocupação. Clique em salvar quando terminar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="edit-name"
                    value={occupationName}
                    onChange={(e) => setOccupationName(e.target.value)}
                    className="col-span-3"
                    placeholder="Nome da ocupação"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="mr-2">Cancelar</Button>
                <Button type="submit" onClick={handleEditOccupationSave}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Remover Ocupação</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja remover a ocupação {occupationToDelete?.name}?
                  Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center bg-destructive/10 p-3 rounded-md mt-2">
                <AlertCircle className="h-5 w-5 text-destructive mr-2" />
                <p className="text-sm">Todos os dados relacionados a esta ocupação serão perdidos.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="mr-2">Cancelar</Button>
                <Button variant="destructive" onClick={handleDeleteOccupationConfirm}>Remover</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-6">
          {Array.isArray(allOccupations) && allOccupations.length > 0 ? (
            allOccupations.map((occupation) => (
              <Card key={occupation.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{occupation.name}</h3>
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <Users className="h-3.5 w-3.5 mr-1" />
                            {derivedOccupationUsers[occupation.id]?.length || 0} usuários
                          </div>
                           {occupation.created_at && (
                            <div className="flex items-center">
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              Criado em {new Date(occupation.created_at).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog open={addUserDialogOpen && selectedOccupationIdForUser === occupation.id} onOpenChange={(isOpen) => {
                          if (!isOpen) {
                            setAddUserDialogOpen(false);
                            setSelectedOccupationIdForUser(null);
                            setSelectedUserId(''); // Limpa o usuário selecionado ao fechar
                          } else {
                             setSelectedOccupationIdForUser(occupation.id);
                             setAddUserDialogOpen(true); // Abre o diálogo
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // A lógica de abertura agora está no onOpenChange
                              }}
                              className="gap-1.5"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              Adicionar Usuário
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Adicionar Usuário à Ocupação: {occupation.name}</DialogTitle>
                              <DialogDescription>
                                Selecione um usuário para adicionar a esta ocupação.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="user-select" className="text-right">
                                  Usuário
                                </Label>
                                <Select
                                  value={selectedUserId}
                                  onValueChange={setSelectedUserId}
                                >
                                  <SelectTrigger id="user-select" className="col-span-3">
                                    <SelectValue placeholder="Selecione um usuário" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.isArray(usersQueryData) ? usersQueryData.filter(user => 
                                      !derivedOccupationUsers[occupation.id]?.find(ou => ou.id === user.id)
                                    ).map((user) => (
                                      <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.name} ({user.email})
                                      </SelectItem>
                                    )) : []}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                               <Button variant="outline" onClick={() => {
                                setAddUserDialogOpen(false);
                                setSelectedOccupationIdForUser(null);
                                setSelectedUserId('');
                              }} className="mr-2">
                                Cancelar
                              </Button>
                              <Button type="submit" onClick={() => {
                                toast.error('Funcionalidade não disponível - API não implementada');
                                setAddUserDialogOpen(false);
                                setSelectedOccupationIdForUser(null);
                                setSelectedUserId('');
                              }}>Adicionar</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditOccupationStart(occupation)}
                            title="Editar ocupação"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                            onClick={() => handleDeleteOccupation(occupation)}
                            title="Remover ocupação"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          Usuários na Ocupação
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {derivedOccupationUsers[occupation.id]?.length || 0} usuários
                        </span>
                      </div>

                      {derivedOccupationUsers[occupation.id]?.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {derivedOccupationUsers[occupation.id].map((user) => (
                            <div key={`${occupation.id}-${user.id}`} className="flex items-center justify-between p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                   <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                                  <AvatarFallback className="text-xs">
                                    {user.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="font-medium text-sm">
                                  {user.name || user.email || `Usuário ${user.id}`}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                                onClick={() => toast.error('Funcionalidade não disponível - API não implementada')}
                                title="Remover usuário da ocupação"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                         <div className="text-muted-foreground text-sm p-3 bg-muted rounded-md text-center">
                           Nenhum usuário nesta ocupação. Adicione usuários usando o botão acima.
                         </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            !loading && !error && (
            <Card className="col-span-1">
              <CardContent className="p-6 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhuma Ocupação Encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando uma nova ocupação para organizar seus usuários.
                </p>
                <Button className="gap-1" onClick={() => setIsDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4" />
                  Criar Nova Ocupação
                </Button>
              </CardContent>
            </Card>
            )
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default OccupationsPage;
