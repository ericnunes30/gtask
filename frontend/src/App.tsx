import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import './styles/tiptap.css';
import 'prosemirror-view/style/prosemirror.css';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { TaskModalProvider } from '@/contexts/TaskModalContext';
import { setupAuthInterceptor } from '@/services/backend/api';
import AppRoutes from "@/routes";

import { useTimerSocket } from '@/hooks/useTimerSocket';

// Helper component to setup the interceptor, since it needs access to auth context
const AuthInterceptorSetup = () => {
  const { refreshAuthToken, logout } = useAuth();

  useEffect(() => {
    setupAuthInterceptor(refreshAuthToken, logout);
  }, [refreshAuthToken, logout]);

  return null; // This component does not render anything
};

const TimerSocketSetup = () => {
  useTimerSocket();
  return null;
};

const App = () => {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <TooltipProvider>
          <AuthProvider>
            <SocketProvider>
              <NotificationProvider>
                <TaskModalProvider>
                  <AuthInterceptorSetup />
                  <TimerSocketSetup />
                  <Toaster />
                  <Sonner />
                  <AppRoutes />
                </TaskModalProvider>
              </NotificationProvider>
            </SocketProvider>
          </AuthProvider>
        </TooltipProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
};

export default App;
