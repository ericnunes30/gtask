import React, { Suspense } from 'react';
import PageLoading from './PageLoading';
import { AppLayout } from '@/components/layout/AppLayout';

interface LazyLoadingWrapperProps {
  children: React.ReactNode;
  loadingType?: 'list' | 'detail' | 'form' | 'table' | 'dashboard';
  useLayout?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Componente wrapper para lazy loading com layout e loading states apropriados
 */
export const LazyLoadingWrapper: React.FC<LazyLoadingWrapperProps> = ({
  children,
  loadingType = 'list',
  useLayout = true,
  fallback
}) => {
  const LoadingComponent = fallback || (
    <PageLoading type={loadingType} />
  );

  const content = (
    <Suspense fallback={LoadingComponent}>
      {children}
    </Suspense>
  );

  // Se a página usar layout, envolver com AppLayout
  if (useLayout) {
    return (
      <AppLayout>
        {content}
      </AppLayout>
    );
  }

  return content;
};

/**
 * HOC para criar componentes lazy loading com configurações específicas
 */
export const withLazyLoading = (
  Component: React.ComponentType,
  options: {
    loadingType?: 'list' | 'detail' | 'form' | 'table' | 'dashboard';
    useLayout?: boolean;
    fallback?: React.ReactNode;
  } = {}
) => {
  const LazyComponent = React.lazy(Component);

  const WrappedComponent: React.FC = (props) => (
    <LazyLoadingWrapper {...options}>
      <LazyComponent {...props} />
    </LazyLoadingWrapper>
  );

  WrappedComponent.displayName = `LazyLoading(${Component.displayName || 'Component'})`;

  return WrappedComponent;
};

export default LazyLoadingWrapper;