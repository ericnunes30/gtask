import React from 'react';
import { Briefcase, ListChecks, Users, ChevronLeft, ChevronRight, User, Settings, LogOut, LayoutDashboard } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from '@/components/ui/button';
import { SidebarItem } from './SidebarItem';
import { useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/adapters/AuthContextAdapter';

interface SidebarProps {
  collapsed: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const permissions = usePermissions();
  const { logout } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <aside
      className={cn(
        "bg-sidebar h-screen flex flex-col border-r border-sidebar-border transition-all duration-300 ease-in-out z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
        collapsed ? "w-[72px]" : "w-[250px]"
      )}
    >
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-sidebar-border",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <LayoutDashboard className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sidebar-foreground font-semibold text-sm tracking-tight">
              Manager Group
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="h-4 w-4 text-primary" />
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent h-7 w-7 p-0 transition-colors",
            collapsed && "hidden"
          )}
          onClick={onToggle}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <div className="space-y-1">
          <SidebarItem
            icon={LayoutDashboard}
            label="Dashboard"
            href="/"
            collapsed={collapsed}
            active={isActive('/')}
          />
          <SidebarItem
            icon={Briefcase}
            label="Projetos"
            href="/projects"
            collapsed={collapsed}
            active={isActive('/projects')}
          />
          <SidebarItem
            icon={ListChecks}
            label="Tarefas"
            href="/tasks"
            collapsed={collapsed}
            active={isActive('/tasks')}
          />
          {!permissions.isMember && (
            <>
              <SidebarItem
                icon={Users}
                label="Equipes"
                href="/teams"
                collapsed={collapsed}
                active={isActive('/teams')}
              />
              <SidebarItem
                icon={User}
                label="Usuários"
                href="/users"
                collapsed={collapsed}
                active={isActive('/users')}
              />
            </>
          )}
        </div>
      </nav>
      
      <div className="p-3 border-t border-sidebar-border mt-auto space-y-1">
        <SidebarItem
          icon={Settings}
          label="Configurações"
          href="/settings"
          collapsed={collapsed}
          active={isActive('/settings')}
        />
        <SidebarItem
          icon={LogOut}
          label="Sair"
          href="/login"
          collapsed={collapsed}
          active={false}
          onClick={() => logout()}
        />
      </div>
    </aside>
  );
};
