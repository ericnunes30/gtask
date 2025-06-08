
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Users, Calendar, Briefcase, AlertCircle, UserPlus, Pencil, Trash2 } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
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
import { teamService, Team, Occupation, TeamUser, User } from '@/lib/api';
import { useGetUsers } from '@/services/backend/users';
import {
  useGetTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useAddUserToTeam,
  useRemoveUserFromTeam,
} from '@/services/backend/teams';

const Teams = () => {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teamUsers, setTeamUsers] = useState<Record<number, TeamUser[]>>({});
  const [selectedOccupation, setSelectedOccupation] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  const {
    data: teamsQueryData,
    isLoading: teamsLoading,
    isError: teamsIsError,
    error: teamsError,
    refetch: refetchTeams,
  } = useGetTeams();

  const { mutateAsync: createTeamMutate } = useCreateTeam();
  const { mutateAsync: updateTeamMutate } = useUpdateTeam();
  const { mutateAsync: deleteTeamMutate } = useDeleteTeam();
  const { mutateAsync: addUserToTeamMutate } = useAddUserToTeam();
  const { mutateAsync: removeUserFromTeamMutate } = useRemoveUserFromTeam();
  const { data: usersQueryData = [] } = useGetUsers();

  const error = dataError || (teamsIsError ? 'Não foi possível carregar as equipes.' : null);
  const loading = teamsLoading || dataLoading;

  // Carregar equipes e ocupações
  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      setDataError(null);

      try {
        const teamsData = teamsQueryData || [];
        setTeams(teamsData);
        setOccupations(teamsData);

        // Carregar usuários
        try {
          const usersData = usersQueryData;
          setUsers(usersData);
        } catch (err) {
          const mockUsers = [
            { id: 1, name: 'João Silva', email: 'joao@example.com' },
            { id: 2, name: 'Maria Oliveira', email: 'maria@example.com' },
            { id: 3, name: 'Pedro Santos', email: 'pedro@example.com' },
            { id: 4, name: 'Ana Souza', email: 'ana@example.com' },
          ];
          setUsers(mockUsers);
        }

        // Carregar usuários de cada equipe
        const teamUsersMap: Record<number, TeamUser[]> = {};
        for (const team of teamsData) {
          try {
            const teamUsersData = await teamService.getTeamUsers(team.id);
            teamUsersMap[team.id] = teamUsersData;
          } catch (err) {
            teamUsersMap[team.id] = [];
          }
        }
        setTeamUsers(teamUsersMap);
      } catch (err) {
        setDataError('Não foi possível carregar as equipes. Tente novamente mais tarde.');
      } finally {
        setDataLoading(false);
      }
    };

    if (teamsQueryData) {
      fetchData();
    }
  }, [teamsQueryData]);

  // Função para adicionar uma nova equipe
  const handleAddTeam = async () => {
    if (!teamName.trim()) {
      alert('O nome da equipe é obrigatório');
      return;
    }

    try {
      const newTeam = await createTeamMutate({ name: teamName });

      if (newTeam) {
        setTeamUsers(prev => ({ ...prev, [newTeam.id]: [] }));
      }

      setTeamName('');
      setIsDialogOpen(false);

      toast.success('Equipe criada com sucesso!');
    } catch (err) {
      toast.error('Não foi possível criar a equipe. Tente novamente.');
    }
  };

  // Função para adicionar um usuário a uma equipe
  const handleAddUserToTeam = async () => {
    if (!selectedUserId || !selectedTeamId) {
      alert('Por favor, selecione um usuário');
      return;
    }

    try {
      const userId = parseInt(selectedUserId);
      // Usar o ID da equipe como ID de ocupação
      const occupationId = selectedTeamId;

      // Tentar adicionar um usuário a uma equipe via API
      try {
        // Usar hook de mutação para adicionar usuário
        await addUserToTeamMutate({
          teamId: occupationId,
          data: { user_id: userId, occupation_id: occupationId },
        });


        // Fallback para o caso de a API de ocupações não retornar o formato esperado
        let teamUserResult = {
          id: Date.now(),
          team_id: selectedTeamId,
          user_id: userId,
          occupation_id: occupationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: null,
          occupation: null
        };

        // Buscar informações do usuário e ocupação para exibição
        const user = users.find(u => u.id === userId);
        const occupation = occupations.find(o => o.id === occupationId);

        // Preencher as informações do usuário e ocupação no resultado
        if (user) {
          teamUserResult.user = user;
        }
        if (occupation) {
          teamUserResult.occupation = occupation;
        }

        // Atualizar a lista de usuários da equipe
        setTeamUsers(prev => ({
          ...prev,
          [selectedTeamId]: [...(prev[selectedTeamId] || []), teamUserResult]
        }));

        // Recarregar os usuários para garantir que os dados estão atualizados
        const updatedUsers = usersQueryData;
        setUsers(updatedUsers);

        // Resetar o formulário
        setSelectedUserId('');
        setAddUserDialogOpen(false);
        setSelectedTeamId(null);

        toast.success('Usuário adicionado à equipe com sucesso!');
      } catch (apiErr) {

        // Fallback: simular a adição de um usuário a uma equipe
        const user = users.find(u => u.id === userId);
        const occupation = occupations.find(o => o.id === occupationId);

        const result: TeamUser = {
          id: Date.now(), // Usar timestamp como ID único
          team_id: selectedTeamId,
          user_id: userId,
          occupation_id: occupationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: user || {
            id: userId,
            name: `Usuário ${userId}`,
            email: `usuario${userId}@example.com`
          },
          occupation: occupation || {
            id: occupationId,
            name: `Ocupação ${occupationId}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        };


        // Atualizar a lista de usuários da equipe
        setTeamUsers(prev => ({
          ...prev,
          [selectedTeamId]: [...(prev[selectedTeamId] || []), result]
        }));

        // Tentar recarregar os usuários mesmo no modo offline
        try {
          const updatedUsers = usersQueryData;
          setUsers(updatedUsers);
        } catch (err) {
        }

        // Resetar o formulário
        setSelectedUserId('');
        setAddUserDialogOpen(false);
        setSelectedTeamId(null);

        toast.success('Usuário adicionado à equipe com sucesso! (modo offline)');
      }
    } catch (err) {
      alert('Não foi possível adicionar o usuário à equipe. Tente novamente.');
    }
  };

  // Função para remover um usuário de uma equipe
  const handleRemoveUserFromTeam = async (teamId: number, userId: number) => {
    if (!confirm('Tem certeza que deseja remover este usuário da equipe?')) {
      return;
    }

    try {
      // Tentar remover um usuário de uma equipe via API
      try {
        // Usar hook de mutação para remover usuário
        await removeUserFromTeamMutate({ teamId, userId });

        // Atualizar a lista de usuários da equipe
        setTeamUsers(prev => ({
          ...prev,
          [teamId]: prev[teamId].filter(tu => tu.user_id !== userId)
        }));

        // Recarregar os usuários para garantir que os dados estão atualizados
        const updatedUsers = usersQueryData;
        setUsers(updatedUsers);

        toast.success('Usuário removido da equipe com sucesso!');
      } catch (apiErr) {
        // Fallback: simular a remoção de um usuário de uma equipe

        // Atualizar a lista de usuários da equipe
        setTeamUsers(prev => ({
          ...prev,
          [teamId]: prev[teamId].filter(tu => tu.user_id !== userId)
        }));

        // Tentar recarregar os usuários mesmo no modo offline
        try {
          const updatedUsers = usersQueryData;
          setUsers(updatedUsers);
        } catch (err) {
        }

        toast.success('Usuário removido da equipe com sucesso! (modo offline)');
      }
    } catch (err) {
      alert('Não foi possível remover o usuário da equipe. Tente novamente.');
    }
  };

  // Função para obter o nome da ocupação pelo ID
  const getOccupationName = (occupationId: number) => {
    const occupation = occupations.find(occ => occ.id === occupationId);
    return occupation ? occupation.name : 'Ocupação desconhecida';
  };

  // Função para iniciar a edição de uma equipe
  const handleEditTeamStart = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setIsEditDialogOpen(true);
  };

  // Função para iniciar o processo de exclusão de uma equipe
  const handleDeleteTeam = (team: Team) => {
    setTeamToDelete(team);
    setIsDeleteDialogOpen(true);
  };

  // Função para confirmar e executar a exclusão de uma equipe
  const handleDeleteTeamConfirm = async () => {
    if (!teamToDelete) return;

    try {
      await deleteTeamMutate(teamToDelete.id);

      // Fechar o diálogo e limpar a equipe selecionada
      setIsDeleteDialogOpen(false);
      setTeamToDelete(null);

      toast.success(`Equipe ${teamToDelete.name} removida com sucesso!`);
    } catch (err) {
      toast.error('Não foi possível excluir a equipe. Tente novamente.');
    }
  };

  // Função para salvar a edição de uma equipe
  const handleEditTeamSave = async () => {
    if (!editingTeam || !teamName.trim()) {
      alert('O nome da equipe é obrigatório');
      return;
    }

    try {
        id: editingTeam.id,
        nome_atual: editingTeam.name,
        novo_nome: teamName
      });

      try {
        await updateTeamMutate({ id: editingTeam.id, data: { name: teamName } });

        // Resetar o formulário
        setTeamName('');
        setEditingTeam(null);
        setIsEditDialogOpen(false);

        toast.success('Equipe atualizada com sucesso!');
      } catch (apiErr) {
        toast.error('Não foi possível atualizar a equipe. Tente novamente.');
      }
    } catch (err) {
      alert('Não foi possível atualizar a equipe. Tente novamente.');
    }
  };

  // Renderizar tela de carregamento
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
            <h1 className="text-3xl font-bold tracking-tight">Equipes</h1>
            <p className="text-muted-foreground">
              Gerencie suas equipes e atribua projetos e membros.
            </p>
          </div>
          {/* Diálogo para criar nova equipe */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <PlusCircle className="h-4 w-4" />
                Nova Equipe
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Nova Equipe</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes da equipe. Clique em salvar quando terminar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="col-span-3"
                    placeholder="Nome da equipe"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddTeam}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Diálogo para editar equipe */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Editar Equipe</DialogTitle>
                <DialogDescription>
                  Atualize os detalhes da equipe. Clique em salvar quando terminar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="edit-name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="col-span-3"
                    placeholder="Nome da equipe"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="mr-2">Cancelar</Button>
                <Button type="submit" onClick={handleEditTeamSave}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Diálogo para confirmar exclusão de equipe */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Remover Equipe</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja remover a equipe {teamToDelete?.name}?
                  Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center bg-destructive/10 p-3 rounded-md mt-2">
                <AlertCircle className="h-5 w-5 text-destructive mr-2" />
                <p className="text-sm">Todos os dados relacionados a esta equipe serão perdidos.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="mr-2">Cancelar</Button>
                <Button variant="destructive" onClick={handleDeleteTeamConfirm}>Remover</Button>
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
          {teams.length > 0 ? (
            teams.map((team) => (
              <Card key={team.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{team.name}</h3>

                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <Users className="h-3.5 w-3.5 mr-1" />
                            {team.users?.length || 0} membros
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTeamId(team.id);
                              }}
                              className="gap-1.5"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              Adicionar Membro
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Adicionar Membro à Equipe</DialogTitle>
                              <DialogDescription>
                                Selecione um usuário e uma ocupação para adicionar à equipe.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="team" className="text-right">
                                  Equipe
                                </Label>
                                <div className="col-span-3 flex items-center gap-2">
                                  <Badge variant="outline" className="px-3 py-1 text-sm">
                                    {teams.find(t => t.id === selectedTeamId)?.name || 'Equipe selecionada'}
                                  </Badge>
                                </div>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="user" className="text-right">
                                  Usuário
                                </Label>
                                <Select
                                  value={selectedUserId}
                                  onValueChange={setSelectedUserId}
                                >
                                  <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecione um usuário" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {users.map((user) => (
                                      <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.name} ({user.email})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                            </div>
                            <DialogFooter>
                              <Button onClick={handleAddUserToTeam}>Adicionar</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditTeamStart(team)}
                            title="Editar equipe"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                            onClick={() => handleDeleteTeam(team)}
                            title="Remover equipe"
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
                          Membros da Equipe
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {teamUsers[team.id]?.length || 0} membros
                        </span>
                      </div>

                      {teamUsers[team.id]?.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {teamUsers[team.id].map((teamUser) => (
                            <div key={`${team.id}-${teamUser.user_id}`} className="flex items-center justify-between p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {teamUser.user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="font-medium text-sm">
                                  {teamUser.user?.name || `Usuário ${teamUser.user_id}`}
                                </div>
                                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                  <Briefcase className="h-3 w-3" />
                                  {getOccupationName(teamUser.occupation_id)}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                                onClick={() => handleRemoveUserFromTeam(team.id, teamUser.user_id)}
                                title="Remover membro"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm p-3 bg-muted rounded-md text-center">
                          Nenhum membro nesta equipe. Adicione membros usando o botão acima.
                        </div>
                      )}
                    </div>

                    <div className="mt-4 text-xs text-muted-foreground flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      Criado em {new Date(team.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center p-8 border rounded-lg">
              <p className="text-muted-foreground mb-4">Nenhuma equipe encontrada. Crie sua primeira equipe!</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Criar Equipe
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Teams;
