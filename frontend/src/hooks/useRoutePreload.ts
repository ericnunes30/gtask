import React, { useCallback } from 'react';

interface PreloadConfig {
  Projects?: () => Promise<any>;
  Tasks?: () => Promise<any>;
  Teams?: () => Promise<any>;
  TaskDetails?: () => Promise<any>;
  Settings?: () => Promise<any>;
  Users?: () => Promise<any>;
}

/**
 * Hook para pré-carregamento de rotas lazy-loaded
 * Melhora a performance ao carregar chunks antes da navegação
 */
export const useRoutePreload = (config?: PreloadConfig) => {
  const preloadRoute = useCallback<(path: string) => void>((path: string) => {
    // Mapeamento de rotas para seus imports
    const routeMap: Record<string, () => Promise<any>> = {
      '/projects': () => import('@/pages/Projects'),
      '/tasks': () => import('@/pages/Tasks'),
      '/teams': () => import('@/pages/Teams'),
      '/settings': () => import('@/pages/Settings'),
      '/users': () => import('@/pages/Users'),
    };

    const taskDetailMatch = path.match(/\/tasks\/([^\/]+)/);
    if (taskDetailMatch) {
      routeMap[path] = () => import('@/pages/TaskDetails');
    }

    const preloadFn = routeMap[path] || config?.[path.split('/')[1] as keyof PreloadConfig];

    if (preloadFn) {
      // Pré-carrega sem executar
      preloadFn().catch(() => {
        // Silenciosamente ignora erros de pré-carregamento
      });
    }
  }, [config]);

  /**
   * Pré-carrega múltiplas rotas baseado em prioridade
   */
  const preloadPriorityRoutes = useCallback(() => {
    // Pré-carrega rotas mais acessadas primeiro
    const priorityRoutes = ['/projects', '/tasks', '/teams'];
    priorityRoutes.forEach(route => preloadRoute(route));
  }, [preloadRoute]);

  /**
   * Pré-carrega rotas baseado no padrão de navegação do usuário
   */
  const preloadPredictiveRoutes = useCallback((currentPath: string) => {
    // Mapeamento de rotas prováveis baseadas na rota atual
    const predictiveMap: Record<string, string[]> = {
      '/projects': ['/projects', '/tasks'],
      '/tasks': ['/tasks', '/projects'],
      '/teams': ['/teams', '/projects'],
      '/users': ['/users', '/teams'],
      '/settings': ['/settings'],
    };

    const routesToPreload = predictiveMap[currentPath] || [];

    // Adiciona um pequeno delay para não competir com a navegação atual
    setTimeout(() => {
      routesToPreload.forEach(route => preloadRoute(route));
    }, 100);
  }, [preloadRoute]);

  return {
    preloadRoute,
    preloadPriorityRoutes,
    preloadPredictiveRoutes
  };
};

export default useRoutePreload;