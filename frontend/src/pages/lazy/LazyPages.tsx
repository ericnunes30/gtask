import React, { lazy, Suspense } from 'react';
import PageLoading from '@/components/loading/PageLoading';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';

// Importação lazy das páginas com configurações específicas de loading
const LazyProjects = lazy(() => import('@/pages/Projects'));
const LazyProjectView = lazy(() => import('@/pages/ProjectView'));
const LazyTasks = lazy(() => import('@/pages/Tasks'));
const LazyTeams = lazy(() => import('@/pages/Teams'));
const LazyTaskDetails = lazy(() => import('@/pages/TaskDetails'));
const LazySettings = lazy(() => import('@/pages/Settings'));
const LazyUsers = lazy(() => import('@/pages/Users'));
const LazyComponents = lazy(() => import('@/pages/Components'));

// Componentes wrapper com lazy loading e error handling
export const LazyProjectsPage: React.FC = () => (
  <PageErrorBoundary>
    <Suspense fallback={<PageLoading type="list" />}>
      <LazyProjects />
    </Suspense>
  </PageErrorBoundary>
);

export const LazyProjectViewPage: React.FC = () => (
  <PageErrorBoundary>
    <Suspense fallback={<PageLoading type="detail" />}>
      <LazyProjectView />
    </Suspense>
  </PageErrorBoundary>
);

export const LazyTasksPage: React.FC = () => (
  <PageErrorBoundary>
    <Suspense fallback={<PageLoading type="list" />}>
      <LazyTasks />
    </Suspense>
  </PageErrorBoundary>
);

export const LazyTeamsPage: React.FC = () => (
  <PageErrorBoundary>
    <Suspense fallback={<PageLoading type="list" />}>
      <LazyTeams />
    </Suspense>
  </PageErrorBoundary>
);

export const LazyTaskDetailsPage: React.FC = () => (
  <PageErrorBoundary>
    <Suspense fallback={<PageLoading type="detail" />}>
      <LazyTaskDetails />
    </Suspense>
  </PageErrorBoundary>
);

export const LazySettingsPage: React.FC = () => (
  <PageErrorBoundary>
    <Suspense fallback={<PageLoading type="form" />}>
      <LazySettings />
    </Suspense>
  </PageErrorBoundary>
);

export const LazyUsersPage: React.FC = () => (
  <PageErrorBoundary>
    <Suspense fallback={<PageLoading type="table" />}>
      <LazyUsers />
    </Suspense>
  </PageErrorBoundary>
);

export const LazyComponentsPage: React.FC = () => (
  <PageErrorBoundary>
    <Suspense fallback={<PageLoading type="form" />}>
      <LazyComponents />
    </Suspense>
  </PageErrorBoundary>
);

// Exportação dos componentes lazy individuais para uso avançado
export {
  LazyProjects,
  LazyProjectView,
  LazyTasks,
  LazyTeams,
  LazyTaskDetails,
  LazySettings,
  LazyUsers,
  LazyComponents
};