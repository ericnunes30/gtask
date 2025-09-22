import { useAuth } from '@/contexts/adapters/AuthContextAdapter';
import { useState, useEffect } from 'react';
import { Role } from '@/common/types'; // Import Role interface

// Definimos a interface para o objeto de permissões que o hook retornará
export interface Permissions {
  // userPermissions será um objeto onde a chave é o nome da permissão e o valor é boolean (true se tiver, false se não)
  // Por enquanto, vamos derivar as permissões dos nomes dos papéis
  userPermissions: { [key: string]: boolean };
  // Função principal para verificar se o usuário tem uma permissão específica
  can: (permission: string) => boolean;
  // Flags de papel (ainda úteis para lógica de UI mais genérica, mas derivadas dos papéis)
  isAdmin: boolean;
  isManager: boolean;
  isMember: boolean;
  isGuest: boolean;
  isLoading: boolean; // Adicionado para indicar se as permissões ainda estão sendo calculadas
}

export const usePermissions = (): Permissions => {
  const { user } = useAuth(); // Obtém o objeto do usuário do contexto de autenticação

  // Estado interno para armazenar as permissões processadas
  const [processedPermissions, setProcessedPermissions] = useState<Permissions>({
    userPermissions: {},
    can: () => false, // Função padrão que sempre retorna false
    isAdmin: false,
    isManager: false,
    isMember: false,
    isGuest: false,
    isLoading: true, // Inicialmente true
  });

  useEffect(() => {
    const newPermissions: { [key: string]: boolean } = {};
    let isAdmin = false;
    let isManager = false;
    let isMember = false;
    let isGuest = false;

    if (user) {
      // Derivar flags de papel a partir dos papéis do usuário
      // E também definir permissões baseadas nos papéis (se não houver permissões granulares diretas)
      if (user.roles && Array.isArray(user.roles)) {
        const roleNames = user.roles.map((role: Role | number) => typeof role === 'object' ? role.name : null).filter(Boolean) as string[];

        isAdmin = roleNames.includes('Administrador');
        isManager = roleNames.includes('Gerente');
        isMember = roleNames.includes('Membro');
        isGuest = roleNames.includes('Convidado');

        // Mapeamento de papéis para permissões (se o backend não enviar permissões granulares)
        // Esta é uma lógica de fallback/transição
        if (isAdmin) {
          newPermissions['task:create'] = true;
          newPermissions['task:edit:all'] = true;
          newPermissions['task:delete'] = true;
          newPermissions['project:create'] = true;
          newPermissions['project:edit'] = true;
          newPermissions['project:delete'] = true;
          newPermissions['user:manage'] = true;
          newPermissions['team:manage'] = true;
          // Adicione outras permissões de administrador aqui
        } else if (isManager) {
          newPermissions['task:create'] = true;
          newPermissions['task:edit:all'] = true; // Gerente pode editar todas as tarefas
          newPermissions['project:create'] = true;
          newPermissions['project:edit'] = true;
          newPermissions['user:manage'] = true; // Gerente pode gerenciar usuários
          newPermissions['team:manage'] = true;
          // Adicione outras permissões de gerente aqui
        } else if (isMember) {
          newPermissions['task:edit:status'] = true;
          newPermissions['task:add:comment'] = true;
          // Adicione outras permissões de membro aqui
        } else if (isGuest) {
          newPermissions['task:add:comment'] = true;
          // Adicione outras permissões de convidado aqui
        }
      }
    }

    // A função 'can' verifica se uma permissão está no objeto newPermissions
    const canFunction = (permission: string) => newPermissions[permission] === true;

    setProcessedPermissions({
      userPermissions: newPermissions,
      can: canFunction,
      isAdmin,
      isManager,
      isMember,
      isGuest,
      isLoading: false, // Permissões calculadas
    });
    

  }, [user]); // Re-calcula as permissões sempre que o objeto 'user' muda

  return processedPermissions;
};