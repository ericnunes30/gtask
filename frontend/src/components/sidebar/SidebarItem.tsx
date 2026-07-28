
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
  onClick?: () => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  href,
  collapsed,
  active,
  onClick,
}) => {
  const { preloadRoute } = useRoutePreload();

  const handleMouseEnter = () => {
    if (!active) {
      preloadRoute(href);
    }
  };

  const handleFocus = () => {
    if (!active) {
      preloadRoute(href);
    }
  };

  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
        "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
        active && "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm"
      )}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      onClick={(e) => {
        if (active) {
          e.preventDefault();
        }
        onClick?.();
      }}
    >
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
        active ? "bg-primary/15 text-primary" : "text-sidebar-foreground/60"
      )}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
};
