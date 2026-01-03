import React, { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import './styles/tiptap.css';
import 'prosemirror-view/style/prosemirror.css';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setupAuthInterceptor } from '@/services/backend/api';
import AppRoutes from "@/routes";
import { AppInitializer } from '@/components/AppInitializer';
import { TaskModalProvider } from '@/components/providers/TaskModalProvider';

import { useTimerSocket } from '@/hooks/useTimerSocket';
import { usePreloadRoute } from '@/hooks/usePreloadRoute';
import { useRoutePreload } from '@/hooks/useRoutePreload';
import { PageTransition } from '@/components/transitions/PageTransition';

// Helper component to setup the interceptor, since it needs access to auth store
const AuthInterceptorSetup = () => {
  const refreshAuthToken = useAuthStore((state) => state.refreshAuthToken);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    setupAuthInterceptor(refreshAuthToken, logout);
  }, [refreshAuthToken, logout]);

  return null; // This component does not render anything
};

// Import the store hook
import { useAuthStore } from '@/stores/authStore';

const TimerSocketSetup = () => {
  useTimerSocket();
  return null;
};

const AppWithLocation = () => {
  const location = useLocation();
  const { preloadPriorityRoutes, preloadPredictiveRoutes } = useRoutePreload();

  // Use o hook de pré-carregamento existente
  const { preloadAfterDelay } = usePreloadRoute();

  useEffect(() => {
    // Pré-carrega rotas prioritárias quando o app inicia
    preloadPriorityRoutes();

    // Pré-carrega rotas baseadas na navegação atual
    preloadPredictiveRoutes(location.pathname);
  }, [location.pathname, preloadPriorityRoutes, preloadPredictiveRoutes]);

  useEffect(() => {
    // Pré-carrega rotas específicas com delay usando o hook existente
    const timeouts = [
      setTimeout(() => import('@/pages/Teams'), 2000),
      setTimeout(() => import('@/pages/Users'), 2500),
      setTimeout(() => import('@/pages/ProjectView'), 3000),
      setTimeout(() => import('@/pages/TaskDetails'), 3500)
    ];

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <PageTransition location={location.pathname}>
      <AppRoutes />
    </PageTransition>
  );
};

const App = () => {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <TooltipProvider>
          <AppInitializer>
            <TaskModalProvider>
              <AuthInterceptorSetup />
              <TimerSocketSetup />
              <Toaster />
              <Sonner />
              <AppWithLocation />
            </TaskModalProvider>
          </AppInitializer>
        </TooltipProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
};

export default App;
