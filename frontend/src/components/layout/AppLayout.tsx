import React, { useState, useEffect } from 'react';
import { Sidebar } from '../sidebar/Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
  contextualSidebar?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, contextualSidebar }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      {contextualSidebar}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
