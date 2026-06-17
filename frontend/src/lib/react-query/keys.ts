// Constantes de Query Keys tipadas para melhor organização e autocomplete

// Tipos básicos
type EntityId = string | number
type QueryParams = Record<string, any>

// Keys de Autenticação
export const authKeys = {
  all: ['auth'] as const,
  login: () => [...authKeys.all, 'login'] as const,
  register: () => [...authKeys.all, 'register'] as const,
  refreshToken: () => [...authKeys.all, 'refresh'] as const,
  logout: () => [...authKeys.all, 'logout'] as const,
}

// Keys de Usuários
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: QueryParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...userKeys.details(), id] as const,
  currentUser: ['currentUser'] as const,
  profile: ['profile'] as const,
}

// Keys de Projetos
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (params: QueryParams) => [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...projectKeys.details(), id] as const,
  statistics: (id: EntityId) => [...projectKeys.detail(id), 'statistics'] as const,
  members: (id: EntityId) => [...projectKeys.detail(id), 'members'] as const,
  tasks: (projectId: EntityId) => ['projectTasks', projectId] as const,
  activity: (projectId: EntityId) => [...projectKeys.detail(projectId), 'activity'] as const,
}

// Keys de Tarefas
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (params: QueryParams) => [...taskKeys.lists(), params] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...taskKeys.details(), id] as const,
  comments: (taskId: EntityId) => ['taskComments', taskId] as const,
  timer: (taskId: EntityId) => [...taskKeys.detail(taskId), 'timer'] as const,
  history: (taskId: EntityId) => [...taskKeys.detail(taskId), 'history'] as const,
  dependencies: (taskId: EntityId) => [...taskKeys.detail(taskId), 'dependencies'] as const,
  byProject: (projectId: EntityId) => [...taskKeys.lists(), { projectId }] as const,
  byAssignee: (userId: EntityId) => [...taskKeys.lists(), { assigneeId: userId }] as const,
  byStatus: (status: string) => [...taskKeys.lists(), { status }] as const,
}

// Keys de Equipes
export const teamKeys = {
  all: ['teams'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: (params: QueryParams) => [...teamKeys.lists(), params] as const,
  details: () => [...teamKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...teamKeys.details(), id] as const,
  members: (id: EntityId) => [...teamKeys.detail(id), 'members'] as const,
  projects: (id: EntityId) => [...teamKeys.detail(id), 'projects'] as const,
}

// Keys de Cargos
export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (params: QueryParams) => [...roleKeys.lists(), params] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...roleKeys.details(), id] as const,
  permissions: (id: EntityId) => [...roleKeys.detail(id), 'permissions'] as const,
}

// Keys de Comentários
export const commentKeys = {
  all: ['comments'] as const,
  lists: () => [...commentKeys.all, 'list'] as const,
  list: (params: QueryParams) => [...commentKeys.lists(), params] as const,
  details: () => [...commentKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...commentKeys.details(), id] as const,
  byTask: (taskId: EntityId) => [...commentKeys.lists(), { taskId }] as const,
  byProject: (projectId: EntityId) => [...commentKeys.lists(), { projectId }] as const,
}

// Keys de Notificações
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params: QueryParams) => [...notificationKeys.lists(), params] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...notificationKeys.details(), id] as const,
  unread: () => [...notificationKeys.lists(), 'unread'] as const,
  byType: (type: string) => [...notificationKeys.lists(), { type }] as const,
  count: () => [...notificationKeys.all, 'count'] as const,
}

// Keys de Ocupações
export const occupationKeys = {
  all: ['occupations'] as const,
  lists: () => [...occupationKeys.all, 'list'] as const,
  list: (params: QueryParams) => [...occupationKeys.lists(), params] as const,
  details: () => [...occupationKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...occupationKeys.details(), id] as const,
}

// Keys de Tarefas Recorrentes
export const recurringTaskKeys = {
  all: ['recurringTasks'] as const,
  lists: () => [...recurringTaskKeys.all, 'list'] as const,
  list: (params: QueryParams) => [...recurringTaskKeys.lists(), params] as const,
  details: () => [...recurringTaskKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...recurringTaskKeys.details(), id] as const,
  byProject: (projectId: EntityId) => [...recurringTaskKeys.lists(), { projectId }] as const,
  occurrences: (id: EntityId) => [...recurringTaskKeys.detail(id), 'occurrences'] as const,
}

// Keys de Dashboard e Estatísticas
export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: () => [...dashboardKeys.all, 'overview'] as const,
  metrics: () => [...dashboardKeys.all, 'metrics'] as const,
  charts: (type: string) => [...dashboardKeys.all, 'charts', type] as const,
  activity: (period: string) => [...dashboardKeys.all, 'activity', period] as const,
}

// Keys de Busca
export const searchKeys = {
  all: ['search'] as const,
  results: (query: string, params: QueryParams) => [...searchKeys.all, query, params] as const,
  suggestions: (query: string) => [...searchKeys.all, 'suggestions', query] as const,
  history: () => [...searchKeys.all, 'history'] as const,
}

// Keys de Arquivos/Anexos
export const fileKeys = {
  all: ['files'] as const,
  lists: () => [...fileKeys.all, 'list'] as const,
  list: (params: QueryParams) => [...fileKeys.lists(), params] as const,
  details: () => [...fileKeys.all, 'detail'] as const,
  detail: (id: EntityId) => [...fileKeys.details(), id] as const,
  byTask: (taskId: EntityId) => [...fileKeys.lists(), { taskId }] as const,
  byProject: (projectId: EntityId) => [...fileKeys.lists(), { projectId }] as const,
  upload: () => [...fileKeys.all, 'upload'] as const,
}

// Utilitários para construir keys dinâmicas
export const buildQueryKey = (
  base: readonly string[],
  ...args: (string | number | QueryParams)[]
) => {
  return [...base, ...args.filter(Boolean)]
}

// Verificador de keys para depuração
export const isQueryKey = (key: unknown): key is readonly unknown[] => {
  return Array.isArray(key)
}

// Exportar todas as keys em um objeto único para facilidade de uso
export const queryKeys = {
  auth: authKeys,
  users: userKeys,
  projects: projectKeys,
  tasks: taskKeys,
  teams: teamKeys,
  roles: roleKeys,
  comments: commentKeys,
  notifications: notificationKeys,
  occupations: occupationKeys,
  recurringTasks: recurringTaskKeys,
  dashboard: dashboardKeys,
  search: searchKeys,
  files: fileKeys,
} as const