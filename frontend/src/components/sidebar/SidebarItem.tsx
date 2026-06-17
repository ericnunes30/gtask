
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/utils';
import { useRoutePreload } from '@/hooks/useRoutePreload';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  collapsed: boolean;
  active?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  href,
  collapsed,
  active
}) => {
  const location = useLocation();
  const { preloadRoute } = useRoutePreload();

  const handleMouseEnter = () => {
    // Pré-carrega a rota quando o mouse passa sobre o item
    if (!active) {
      preloadRoute(href);
    }
  };

  const handleFocus = () => {
    // Pré-carrega a rota quando o item recebe foco
    if (!active) {
      preloadRoute(href);
    }
  };

  return (
    <Link
      to={href}
      className={cn(
        "sidebar-item",
        active && "active"
      )}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      onClick={(e) => {
        // Previne navegação se já estiver na página
        if (active) {
          e.preventDefault();
        }
      }}
    >
      <Icon className="h-5 w-5 text-sidebar-foreground" />
      {!collapsed && <span className="text-sidebar-foreground">{label}</span>}
    </Link>
  );
};
