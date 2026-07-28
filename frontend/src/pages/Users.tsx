import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Users as UsersIcon,
  Search,
  Pencil,
  Trash2,
  Phone,
  Calendar,
  AlertCircle,
  Filter,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
} from "@/utils/commonTypes";
import { useBackendServices } from "@/hooks/useBackendServices";
import { useAssignOccupations } from "@/services/backend/users";
import { useUserSocket } from "@/hooks/useUserSocket";
import { useRoleSocket } from "@/hooks/useRoleSocket";

// Mapeamento de equipes para cores
const colorClasses: Record<number, string> = {
  1: "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200",
  2: "bg-green-100 text-green-800 hover:bg-green-200 border-green-200",
  3: "bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200",
  4: "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200",
  5: "bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-200",
  6: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-200",
  7: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border-cyan-200",
  8: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200",
};

const getBadgeColorClass = (teamId: number) => {
  const colorIndex = teamId
    ? teamId % Object.keys(colorClasses).length || teamId
    : 1;
  return (
    colorClasses[colorIndex] ||
    "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200"
  );
};

const formatWhatsApp = (whatsapp: string) => {
  if (!whatsapp) return null;
  const numbersOnly = whatsapp.replace(/\D/g, "");
  if (numbersOnly.length === 11) {
    return `(${numbersOnly.slice(0, 2)}) ${numbersOnly.slice(2, 7)}-${numbersOnly.slice(7)}`;
  } else if (numbersOnly.length === 10) {
    return `(${numbersOnly.slice(0, 2)}) ${numbersOnly.slice(2, 6)}-${numbersOnly.slice(6)}`;
  }
  return whatsapp;
};

const formatUserDate = (dateString: string | undefined): string => {
  if (!dateString) return "Data não definida";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Data inválida";
    const year = date.getFullYear();
    if (year < 1900 || year > 2100) return "Data inválida";
    return date.toLocaleDateString("pt-BR");
  } catch {
    return "Data inválida";
  }
};

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  occupation_id: "",
  occupations: [] as number[],
  roles: [] as number[],
  is_active: true,
  whatsapp: "",
};

const UsersPage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [newUser, setNewUser] = useState(emptyUserForm);

  const {
    users: usersService,
    roles: rolesService,
    occupations: occupationsService,
    teams: teamsService,
  } = useBackendServices();

  const {
    data: usersQueryData = [],
    isLoading: usersLoading,
    isError: usersIsError,
  } = usersService.useGetUsers();
  const { data: rolesQueryData = [] } = rolesService.useGetRoles();
  const { data: occupationsQueryData = [] } =
    occupationsService.useGetOccupations();

  const { mutateAsync: createUserMutate } = usersService.useCreateUser();
  const { mutateAsync: updateUserMutate } = usersService.useUpdateUser();
  const { mutateAsync: deleteUserMutate } = usersService.useDeleteUser();
  const { mutateAsync: assignOccupationsMutate } = useAssignOccupations();
  const { mutateAsync: addUserToTeamMutate } = teamsService.useAddUserToTeam();
  const { mutateAsync: removeUserFromTeamMutate } =
    teamsService.useRemoveUserFromTeam();

  useUserSocket();
  useRoleSocket();

  const filteredUsers = useMemo(() => {
    if (!Array.isArray(usersQueryData)) return [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return usersQueryData;
    return usersQueryData.filter(
      (user) =>
        (user.name?.toLowerCase() || "").includes(term) ||
        (user.email?.toLowerCase() || "").includes(term) ||
        (user.whatsapp || "").toLowerCase().includes(term.replace(/\D/g, "")),
    );
  }, [usersQueryData, searchTerm]);

  const getOccupationName = (user: User) => {
    if (user.occupation && user.occupation.name) {
      return user.occupation.name;
    }
    const occupationId = user.occupationId || user.occupation_id;
    if (!occupationId) return "Sem ocupação";
    const occupation = Array.isArray(occupationsQueryData)
      ? occupationsQueryData.find((o) => o.id === occupationId)
      : null;
    return occupation ? occupation.name : "Ocupação desconhecida";
  };

  const getRoleName = (roleId: number) => {
    const role = Array.isArray(rolesQueryData)
      ? rolesQueryData.find((r) => r.id === roleId)
      : null;
    return role ? role.name : `Função ${roleId}`;
  };

  const resetForm = () => setNewUser(emptyUserForm);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error("Nome, email e senha são obrigatórios");
      return;
    }
    try {
      const userData: CreateUserRequest = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        is_active: newUser.is_active,
        whatsapp: newUser.whatsapp || undefined,
        occupations: newUser.occupations,
      };
      const createdUser = await createUserMutate(userData);

      if (newUser.roles && newUser.roles.length > 0) {
        try {
          await usersService.userService.assignRoles(
            createdUser.id,
            newUser.roles,
          );
        } catch {
          toast.warning(
            "Usuário criado, mas houve erro ao atribuir nível de permissão.",
          );
        }
      }

      if (newUser.occupations && newUser.occupations.length > 0) {
        try {
          await assignOccupationsMutate({
            userId: createdUser.id,
            occupationIds: newUser.occupations,
          });
        } catch {
          toast.warning("Usuário criado, mas houve erro ao atribuir equipes.");
        }
      }

      resetForm();
      setIsDialogOpen(false);
      toast.success(
        `${createdUser.name || "Usuário"} foi adicionado com sucesso.`,
      );
    } catch {
      toast.error("Não foi possível criar o usuário. Tente novamente.");
    }
  };

  const handleEditUserStart = (user: User) => {
    let userOccupations: number[] = [];
    if (user.occupations && user.occupations.length > 0) {
      userOccupations = user.occupations.map((occ) =>
        typeof occ === "number" ? occ : occ.id,
      );
    } else if (user.occupation_id || user.occupationId) {
      const occupationId = user.occupation_id || user.occupationId;
      if (occupationId) userOccupations = [occupationId];
    }

    let userRoles: number[] = [];
    if (user.roles && Array.isArray(user.roles)) {
      if (
        user.roles.length > 0 &&
        typeof user.roles[0] === "object" &&
        "id" in user.roles[0]
      ) {
        userRoles = user.roles.map((role) => (role as { id: number }).id);
      } else if (user.roles.length > 0 && typeof user.roles[0] === "number") {
        userRoles = user.roles as number[];
      }
    }

    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      password: "",
      occupation_id: user.occupation_id ? String(user.occupation_id) : "",
      occupations: userOccupations,
      roles: userRoles,
      is_active: user.is_active ?? true,
      whatsapp: user.whatsapp || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleEditUserSave = async () => {
    if (!editingUser || !newUser.name || !newUser.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }
    try {
      const userData: UpdateUserRequest = {
        name: newUser.name,
        email: newUser.email,
        is_active: newUser.is_active,
        whatsapp: newUser.whatsapp || undefined,
      };
      if (newUser.password && newUser.password.trim()) {
        userData.password = newUser.password;
      }
      const updatedUser = await updateUserMutate({
        id: editingUser.id,
        data: userData,
      });

      if (newUser.roles && newUser.roles.length > 0) {
        try {
          await usersService.userService.assignRoles(
            editingUser.id,
            newUser.roles,
          );
        } catch {
          toast.warning(
            "Usuário atualizado, mas houve erro ao atribuir nível de permissão.",
          );
        }
      }

      const originalOccupationIds =
        editingUser.occupations?.map((o) =>
          typeof o === "number" ? o : o.id,
        ) || [];
      const newOccupationIds = newUser.occupations || [];
      const occupationsToAdd = newOccupationIds.filter(
        (id) => !originalOccupationIds.includes(id),
      );
      const occupationsToRemove = originalOccupationIds.filter(
        (id) => !newOccupationIds.includes(id),
      );

      await Promise.all([
        ...occupationsToAdd.map((teamId) =>
          addUserToTeamMutate({ teamId, userId: editingUser.id }),
        ),
        ...occupationsToRemove.map((teamId) =>
          removeUserFromTeamMutate({ teamId, userId: editingUser.id }),
        ),
      ]);

      resetForm();
      setEditingUser(null);
      setIsEditDialogOpen(false);
      toast.success(
        `${updatedUser.name || "Usuário"} foi atualizado com sucesso.`,
      );
    } catch {
      toast.error("Não foi possível atualizar o usuário. Tente novamente.");
    }
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUserConfirm = async () => {
    if (!userToDelete) return;
    try {
      deleteUserMutate(userToDelete.id);
      const deletedUserName = userToDelete.name;
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      toast.success(`${deletedUserName} foi removido com sucesso.`);
    } catch {
      toast.error("Não foi possível excluir o usuário. Tente novamente.");
    }
  };

  const handleUpdateUserStatus = async (userId: number, isActive: boolean) => {
    try {
      const user = Array.isArray(usersQueryData)
        ? usersQueryData.find((u) => u.id === userId)
        : null;
      if (!user) {
        toast.error("Usuário não encontrado.");
        return;
      }
      await updateUserMutate({
        id: userId,
        data: {
          is_active: isActive,
          name: user.name,
          email: user.email,
        },
      });
      toast.success(
        `Status do usuário ${user.name} foi atualizado com sucesso.`,
      );
    } catch {
      toast.error(
        "Não foi possível atualizar o status do usuário. Tente novamente.",
      );
    }
  };

  if (usersLoading) {
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card
                key={i}
                className="overflow-hidden border-0 shadow-sm rounded-2xl"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
              <UsersIcon className="h-5 w-5 text-primary/60" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie usuários, permissões e equipes.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl">
                <PlusCircle className="h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes do usuário. Clique em salvar quando
                  terminar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={newUser.name}
                    onChange={handleFormChange}
                    className="col-span-3"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={newUser.email}
                    onChange={handleFormChange}
                    className="col-span-3"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={newUser.password}
                    onChange={handleFormChange}
                    className="col-span-3"
                    placeholder="Senha"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="occupation" className="text-right pt-2">
                    Equipes
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value=""
                      onValueChange={(value) => {
                        const occupationId = parseInt(value);
                        if (!newUser.occupations.includes(occupationId)) {
                          setNewUser((prev) => ({
                            ...prev,
                            occupations: [...prev.occupations, occupationId],
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Adicionar equipe" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(occupationsQueryData)
                          ? occupationsQueryData.map((occupation) => (
                              <SelectItem
                                key={occupation.id}
                                value={occupation.id.toString()}
                              >
                                {occupation.name}
                              </SelectItem>
                            ))
                          : null}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newUser.occupations.map((occupationId) => {
                        const occupation = Array.isArray(occupationsQueryData)
                          ? occupationsQueryData.find(
                              (o) => o.id === occupationId,
                            )
                          : null;
                        return (
                          <div
                            key={occupationId}
                            className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                          >
                            {occupation
                              ? occupation.name
                              : `Equipe ${occupationId}`}
                            <button
                              type="button"
                              onClick={() =>
                                setNewUser((prev) => ({
                                  ...prev,
                                  occupations: prev.occupations.filter(
                                    (id) => id !== occupationId,
                                  ),
                                }))
                              }
                              className="text-secondary-foreground/70 hover:text-secondary-foreground"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="roles" className="text-right pt-2">
                    Nível de Permissão
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value={
                        newUser.roles.length > 0
                          ? newUser.roles[0].toString()
                          : ""
                      }
                      onValueChange={(value) => {
                        const roleId = parseInt(value);
                        setNewUser((prev) => ({ ...prev, roles: [roleId] }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar nível de permissão" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(rolesQueryData)
                          ? rolesQueryData.map((role) => (
                              <SelectItem
                                key={role.id}
                                value={role.id.toString()}
                              >
                                {role.name}
                              </SelectItem>
                            ))
                          : null}
                      </SelectContent>
                    </Select>
                    {newUser.roles.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm text-muted-foreground">
                          Nível de permissão selecionado:
                        </div>
                        <div className="mt-1">
                          <Badge
                            variant="outline"
                            className="rounded-full bg-violet-100 text-violet-800 hover:bg-violet-200 border-violet-200"
                          >
                            {getRoleName(newUser.roles[0])}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="is_active" className="text-right">
                    Ativo
                  </Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={newUser.is_active}
                      onCheckedChange={(checked) =>
                        setNewUser((prev) => ({ ...prev, is_active: checked }))
                      }
                    />
                    <Label htmlFor="is_active" className="text-sm">
                      {newUser.is_active ? "Usuário ativo" : "Usuário inativo"}
                    </Label>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="whatsapp" className="text-right">
                    WhatsApp
                  </Label>
                  <Input
                    id="whatsapp"
                    name="whatsapp"
                    value={newUser.whatsapp}
                    onChange={handleFormChange}
                    className="col-span-3"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddUser}>
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Editar Usuário</DialogTitle>
                <DialogDescription>
                  Atualize os detalhes do usuário. Clique em salvar quando
                  terminar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={newUser.name}
                    onChange={handleFormChange}
                    className="col-span-3"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    value={newUser.email}
                    onChange={handleFormChange}
                    className="col-span-3"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-password" className="text-right">
                    Senha
                  </Label>
                  <Input
                    id="edit-password"
                    name="password"
                    type="password"
                    value={newUser.password}
                    onChange={handleFormChange}
                    className="col-span-3"
                    placeholder="Deixe em branco para manter a senha atual"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="edit-occupation" className="text-right pt-2">
                    Equipes
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value=""
                      onValueChange={(value) => {
                        const occupationId = parseInt(value);
                        if (!newUser.occupations.includes(occupationId)) {
                          setNewUser((prev) => ({
                            ...prev,
                            occupations: [...prev.occupations, occupationId],
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Adicionar equipe" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(occupationsQueryData)
                          ? occupationsQueryData.map((occupation) => (
                              <SelectItem
                                key={occupation.id}
                                value={occupation.id.toString()}
                              >
                                {occupation.name}
                              </SelectItem>
                            ))
                          : null}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newUser.occupations.map((occupationId) => {
                        const occupation = Array.isArray(occupationsQueryData)
                          ? occupationsQueryData.find(
                              (o) => o.id === occupationId,
                            )
                          : null;
                        return (
                          <div
                            key={occupationId}
                            className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                          >
                            {occupation
                              ? occupation.name
                              : `Equipe ${occupationId}`}
                            <button
                              type="button"
                              onClick={() =>
                                setNewUser((prev) => ({
                                  ...prev,
                                  occupations: prev.occupations.filter(
                                    (id) => id !== occupationId,
                                  ),
                                }))
                              }
                              className="text-secondary-foreground/70 hover:text-secondary-foreground"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="edit-roles" className="text-right pt-2">
                    Nível de Permissão
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value={
                        newUser.roles.length > 0
                          ? newUser.roles[0].toString()
                          : ""
                      }
                      onValueChange={(value) => {
                        const roleId = parseInt(value);
                        setNewUser((prev) => ({ ...prev, roles: [roleId] }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar nível de permissão" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(rolesQueryData)
                          ? rolesQueryData.map((role) => (
                              <SelectItem
                                key={role.id}
                                value={role.id.toString()}
                              >
                                {role.name}
                              </SelectItem>
                            ))
                          : null}
                      </SelectContent>
                    </Select>
                    {newUser.roles.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm text-muted-foreground">
                          Nível de permissão selecionado:
                        </div>
                        <div className="mt-1">
                          <Badge
                            variant="outline"
                            className="rounded-full bg-violet-100 text-violet-800 hover:bg-violet-200 border-violet-200"
                          >
                            {getRoleName(newUser.roles[0])}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-is_active" className="text-right">
                    Ativo
                  </Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Switch
                      id="edit-is_active"
                      checked={newUser.is_active}
                      onCheckedChange={(checked) =>
                        setNewUser((prev) => ({ ...prev, is_active: checked }))
                      }
                    />
                    <Label htmlFor="edit-is_active" className="text-sm">
                      {newUser.is_active ? "Usuário ativo" : "Usuário inativo"}
                    </Label>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-whatsapp" className="text-right">
                    WhatsApp
                  </Label>
                  <Input
                    id="edit-whatsapp"
                    name="whatsapp"
                    value={newUser.whatsapp}
                    onChange={handleFormChange}
                    className="col-span-3"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="mr-2"
                >
                  Cancelar
                </Button>
                <Button type="submit" onClick={handleEditUserSave}>
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Remover Usuário</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja remover o usuário {userToDelete?.name}?
                  Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center bg-destructive/10 p-3 rounded-md mt-2">
                <AlertCircle className="h-5 w-5 text-destructive mr-2" />
                <p className="text-sm">
                  Todos os dados relacionados a este usuário serão perdidos.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="mr-2"
                >
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDeleteUserConfirm}>
                  Remover
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {usersIsError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Não foi possível carregar os usuários.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" title="Filtrar">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <Card
                key={user.id}
                className="overflow-hidden border-0 shadow-sm rounded-2xl bg-white"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">
                          {user.name
                            ? user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .substring(0, 2)
                                .toUpperCase()
                            : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-base leading-tight">
                          {user.name || "Nome não definido"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {user.email || "Email não definido"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditUserStart(user)}
                        title="Editar usuário"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(user)}
                        title="Remover usuário"
                        className="text-red-500 hover:text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.is_active !== false}
                        onCheckedChange={(checked) =>
                          handleUpdateUserStatus(user.id, checked)
                        }
                      />
                      <span
                        className={`text-sm font-medium ${user.is_active !== false ? "text-green-600" : "text-gray-500"}`}
                      >
                        {user.is_active !== false ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    {user.whatsapp ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 text-green-600" />
                        <span className="font-mono">
                          {formatWhatsApp(user.whatsapp)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Equipes
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {user.occupations && user.occupations.length > 0 ? (
                        user.occupations.map((occ) => {
                          const teamId = typeof occ === "number" ? occ : occ.id;
                          const teamName =
                            typeof occ === "number"
                              ? (Array.isArray(occupationsQueryData)
                                  ? occupationsQueryData.find(
                                      (o) => o.id === occ,
                                    )?.name
                                  : null) || "Ocupação desconhecida"
                              : occ.name;
                          return (
                            <Badge
                              key={teamId}
                              variant="outline"
                              className={`rounded-full ${getBadgeColorClass(teamId)}`}
                            >
                              {teamName}
                            </Badge>
                          );
                        })
                      ) : user.occupation_id ||
                        user.occupationId ||
                        user.occupation ? (
                        <Badge
                          variant="outline"
                          className={`rounded-full ${getBadgeColorClass(user.occupation_id || user.occupationId)}`}
                        >
                          {getOccupationName(user)}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Sem equipe
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Permissão
                      </div>
                      {user.roles &&
                      Array.isArray(user.roles) &&
                      user.roles.length > 0 ? (
                        <Badge
                          variant="outline"
                          className="rounded-full bg-violet-100 text-violet-800 hover:bg-violet-200 border-violet-200"
                        >
                          {typeof user.roles[0] === "number"
                            ? getRoleName(user.roles[0])
                            : user.roles[0].name ||
                              `Função ${user.roles[0].id}`}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Sem permissão
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatUserDate(user.created_at || user.createdAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="p-6 text-center">
                <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Nenhum Usuário Encontrado
                </h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando um novo usuário para sua equipe.
                </p>
                <Button className="gap-1" onClick={() => setIsDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4" />
                  Criar Novo Usuário
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default UsersPage;
