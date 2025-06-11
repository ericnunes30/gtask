// frontend/src/hooks/useBackendServices.ts
import * as authHooks from '../services/backend/auth';
import * as commentsHooks from '../services/backend/comments';
import * as occupationsHooks from '../services/backend/occupations';
import * as projectsHooks from '../services/backend/projects';
import * as rolesHooks from '../services/backend/roles';
import * as tasksHooks from '../services/backend/tasks';
import * as usersHooks from '../services/backend/users';

export const useBackendServices = () => {
  return {
    auth: authHooks,
    comments: commentsHooks,
    occupations: occupationsHooks,
    projects: projectsHooks,
    roles: rolesHooks,
    tasks: tasksHooks,
    users: usersHooks,
  };
};