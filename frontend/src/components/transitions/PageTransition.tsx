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
  location
}) => {
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  React.useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [location]);

  return (
    <div className={`page-transition ${isTransitioning ? 'transitioning' : ''}`}>
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