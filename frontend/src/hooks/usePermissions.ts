import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

// Definição dos tipos de permissões
export type UserRole = 'Administrador' | 'Gerente' | 'Membro' | 'Convidado';

// Interface para as permissões
export interface Permissions {
  // Projetos
  canViewAllProjects: boolean;
  canEditProjects: boolean;
  canCreateProjects: boolean;
  canDeleteProjects: boolean;
  
  // Tarefas
  canViewAllTasks: boolean;
  canCreateTasks: boolean;
  canEditAllTaskFields: boolean;
  canEditTaskStatus: boolean;
  canEditTaskComments: boolean;
  canAssignTasks: boolean;
  canDeleteTasks: boolean;
  
  // Usuários
  canManageUsers: boolean;
  
  // Equipes
  canManageTeams: boolean;
  
  // Função para verificar o papel do usuário
  userRole: UserRole | null;
  isMember: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isGuest: boolean;
}

export const usePermissions = (): Permissions => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permissions>({
    // Valores padrão (sem permissões)
    canViewAllProjects: false,
    canEditProjects: false,
    canCreateProjects: false,
    canDeleteProjects: false,
    
    canViewAllTasks: false,
    canCreateTasks: false,
    canEditAllTaskFields: false,
    canEditTaskStatus: false,
    canEditTaskComments: false,
    canAssignTasks: false,
    canDeleteTasks: false,
    
    canManageUsers: false,
    canManageTeams: false,
    
    userRole: null,
    isMember: false,
    isAdmin: false,
    isManager: false,
    isGuest: false,
  });

  useEffect(() => {
    if (!user || !user.roles || !Array.isArray(user.roles) || user.roles.length === 0) {
      return;
    }

    // Obter o papel do usuário
    // Assumindo que user.roles é um array de objetos ou números
    const roleId = typeof user.roles[0] === 'number' ? user.roles[0] : user.roles[0]?.id;
    let roleName: UserRole | null = null;

    // Mapear o ID do papel para o nome
    // IDs baseados no seed do backend
    switch (roleId) {
      case 1:
        roleName = 'Administrador';
        break;
      case 2:
        roleName = 'Gerente';
        break;
      case 3:
        roleName = 'Membro';
        break;
      case 4:
        roleName = 'Convidado';
        break;
      default:
        roleName = null;
    }

    // Definir permissões com base no papel
    const newPermissions: Permissions = {
      // Valores padrão (sem permissões)
      canViewAllProjects: false,
      canEditProjects: false,
      canCreateProjects: false,
      canDeleteProjects: false,
      
      canViewAllTasks: false,
      canCreateTasks: false,
      canEditAllTaskFields: false,
      canEditTaskStatus: false,
      canEditTaskComments: false,
      canAssignTasks: false,
      canDeleteTasks: false,
      
      canManageUsers: false,
      canManageTeams: false,
      
      userRole: roleName,
      isMember: roleName === 'Membro',
      isAdmin: roleName === 'Administrador',
      isManager: roleName === 'Gerente',
      isGuest: roleName === 'Convidado',
    };

    // Definir permissões específicas com base no papel
    if (roleName === 'Administrador') {
      // Administrador tem todas as permissões
      newPermissions.canViewAllProjects = true;
      newPermissions.canEditProjects = true;
      newPermissions.canCreateProjects = true;
      newPermissions.canDeleteProjects = true;
      
      newPermissions.canViewAllTasks = true;
      newPermissions.canCreateTasks = true;
      newPermissions.canEditAllTaskFields = true;
      newPermissions.canEditTaskStatus = true;
      newPermissions.canEditTaskComments = true;
      newPermissions.canAssignTasks = true;
      newPermissions.canDeleteTasks = true;
      
      newPermissions.canManageUsers = true;
      newPermissions.canManageTeams = true;
    } else if (roleName === 'Gerente') {
      // Gerente tem permissões para gerenciar projetos e equipes
      newPermissions.canViewAllProjects = true;
      newPermissions.canEditProjects = true;
      newPermissions.canCreateProjects = true;
      newPermissions.canDeleteProjects = true;
      
      newPermissions.canViewAllTasks = true;
      newPermissions.canCreateTasks = true;
      newPermissions.canEditAllTaskFields = true;
      newPermissions.canEditTaskStatus = true;
      newPermissions.canEditTaskComments = true;
      newPermissions.canAssignTasks = true;
      newPermissions.canDeleteTasks = true;
      
      newPermissions.canManageTeams = true;
    } else if (roleName === 'Membro') {
      // Membro tem permissões limitadas
      newPermissions.canViewAllProjects = false; // Só pode ver projetos em que participa
      newPermissions.canEditProjects = false;
      newPermissions.canCreateProjects = false;
      newPermissions.canDeleteProjects = false;
      
      newPermissions.canViewAllTasks = false; // Só pode ver tarefas vinculadas a ele
      newPermissions.canCreateTasks = false;
      newPermissions.canEditAllTaskFields = false;
      newPermissions.canEditTaskStatus = true; // Pode editar status
      newPermissions.canEditTaskComments = true; // Pode adicionar comentários
      newPermissions.canAssignTasks = false;
      newPermissions.canDeleteTasks = false;
    } else if (roleName === 'Convidado') {
      // Convidado tem apenas permissões de visualização
      newPermissions.canViewAllProjects = false; // Só pode ver projetos em que participa
      newPermissions.canEditProjects = false;
      newPermissions.canCreateProjects = false;
      newPermissions.canDeleteProjects = false;
      
      newPermissions.canViewAllTasks = false; // Só pode ver tarefas vinculadas a ele
      newPermissions.canCreateTasks = false;
      newPermissions.canEditAllTaskFields = false;
      newPermissions.canEditTaskStatus = false;
      newPermissions.canEditTaskComments = true; // Pode adicionar comentários
      newPermissions.canAssignTasks = false;
      newPermissions.canDeleteTasks = false;
    }

    setPermissions(newPermissions);
  }, [user]);

  return permissions;
};
