export const ROUTES = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    register: '/auth/register',
    profile: '/auth/profile',
    verify: '/auth/verify',
    setupStatus: '/auth/setup-status',
    setup: '/auth/setup',
  },
  users: '/users',
  roles: '/roles',
  projects: '/projects',
  tasks: '/tasks',
  comments: '/comments',
  occupations: '/occupations',
  recurringTasks: '/recurring-tasks',
} as const;

export type Routes = typeof ROUTES;

export default ROUTES;
