import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  location?: string;
}

/**
 * Componente para adicionar transições suaves entre páginas
 * Versão simplificada sem react-transition-group para evitar warnings
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
}) => {
  return (
    <div className="page-transition">
      {children}
    </div>
  );
};

/**
 * Componente wrapper para transições de página individual
 */
export const PageTransitionWrapper: React.FC<{
  children: React.ReactNode;
  locationKey?: string;
}> = ({ children, locationKey }) => {
  return (
    <div key={locationKey} className="page-transition-wrapper">
      {children}
    </div>
  );
};

export default PageTransition;