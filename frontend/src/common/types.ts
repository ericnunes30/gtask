// =====================================================
// CENTRALIZED API TYPES
// =====================================================
// This file contains all types, interfaces, enums, and constants
// exported from the API layer (/lib/api)

// =====================================================
// ENUMS & TYPES
// =====================================================

export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type TaskStatus = 'pendente' | 'a_fazer' | 'em_andamento' | 'em_revisao' | 'aguardando_cliente' | 'concluido' | 'cancelado';
export type ProjectPriority = 'baixa' | 'media' | 'alta' | 'urgente';

// =====================================================
// BASE INTERFACES
// =====================================================

export interface Role {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Team { // Renomeado de Occupation para Team
  id: number;
  name: string;
  description?: string; // Tornar opcional
  createdAt?: string; // API retorna createdAt, não created_at
  updatedAt?: string; // API retorna updatedAt, não updated_at
  users?: User[]; // Adicionado para incluir usuários associados à equipe
}


 // =====================================================
 // USER INTERFACES
 // =====================================================

export interface User {
  id: number;
  name: string;
  email: string;
  occupation_id?: number;
  occupationId?: number; // Suporte para formato camelCase
  created_at?: string;
  createdAt?: string; // Suporte para formato camelCase
  updated_at?: string;
  updatedAt?: string; // Suporte para formato camelCase
  is_active?: boolean;
  whatsapp?: string;
  roles?: Role[] | number[];
  permissions?: string[]; // Adicionado para permissões granulares
  occupation?: {
    id: number;
    name: string;
  };
  occupations?: Array<{ // Manter 'occupations' no User para compatibilidade com o backend
    id: number;
    name: string;
  }>;
  avatar_url?: string; // From comments interface
}

export interface CreateUserRequest {
  name: string;
  email?: string;
  password: string;
  occupation_id?: number;
  roles?: number[];
  occupations?: number[];
  is_active?: boolean;
  whatsapp?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  occupation_id?: number;
  roles?: number[];
  teams?: number[];
  is_active?: boolean;
  whatsapp?: string;
}

// =====================================================
// AUTH INTERFACES
// =====================================================

export interface LoginCredentials {
  email?: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// =====================================================
// PROJECT INTERFACES
// =====================================================

export interface Project {
  id: number;
  title: string;
  description: string;
  priority: ProjectPriority;
  status: boolean;
  // Campos internos no frontend
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  // Campos da API
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
  // Relacionamentos
  users?: Array<number | { id: number; name: string; email: string; occupationId?: number }>;
  occupations?: Team[]; // Renomeado de Occupation[] para Team[]
  tasks?: Array<{
    id: number;
    title: string;
    description: string;
    priority: string;
    status: string;
    startDate?: string;
    dueDate?: string;
    projectId?: number;
    order?: number;
    createdAt?: string;
    updatedAt?: string;
  }>;
}

export interface CreateProjectRequest {
  title: string;
  description: string;
  priority: ProjectPriority;
  status: boolean;
  start_date: string;
  end_date: string;
  users?: number[];
  occupations?: number[]; // Manter 'occupations' para o backend
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  priority?: ProjectPriority;
  status?: boolean;
  start_date?: string;
  end_date?: string;
  users?: number[];
  teams?: number[];
}

// =====================================================
// TASK INTERFACES
// =====================================================

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  start_date?: string; // Campo interno no frontend
  due_date?: string; // Campo interno no frontend
  startDate?: string; // Campo usado pela API
  dueDate?: string; // Campo usado pela API
  project_id?: number; // Campo interno no frontend
  order?: number;
  timer?: number; // Tempo em segundos
  task_reviewer_id?: number; // Campo interno no frontend
  taskReviewerId?: number; // Campo usado pela API
  reviewer?: User; // Objeto do revisor (carregado via preload)
  video_url?: string; // URL do vídeo do YouTube
  useful_links?: Array<{title: string, url: string}>; // Links úteis
  observations?: string; // Observações detalhadas
  has_detailed_fields?: boolean; // Flag para campos detalhados
  created_at?: string; // Campo interno no frontend
  updated_at?: string; // Campo interno no frontend
  createdAt?: string; // Campo usado pela API
  updatedAt?: string; // Campo usado pela API
  users?: Array<number | { id: number; name: string; email: string; occupation_id?: number; occupationId?: number }>;
  occupations?: Team[]; // Renomeado de Occupation[] para Team[]
  project?: Project; // Usar a interface Project importada
  comments?: Comment[]; // Adicionado para incluir comentários pré-carregados
  activityLogs?: ActivityLog[]; // Adicionado para incluir logs de atividade pré-carregados
}

export interface ActivityLog {
  id: number;
  taskId: number | null;
  task_id?: number | null; // Suporte para formato snake_case
  userId: number | null;
  user_id?: number | null; // Suporte para formato snake_case
  actionType: string;
  action_type?: string; // Suporte para formato snake_case
  changedField: string | null;
  changed_field?: string | null; // Suporte para formato snake_case
  oldValue: string | null;
  old_value?: string | null; // Suporte para formato snake_case
  newValue: string | null;
  new_value?: string | null; // Suporte para formato snake_case
  referenceId: number | null;
  reference_id?: number | null; // Suporte para formato snake_case
  details: Record<string, any> | null;
  createdAt: string;
  created_at?: string; // Suporte para formato snake_case
  user?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  start_date?: string; // Campo interno no frontend
  due_date?: string; // Campo interno no frontend
  startDate?: string; // Campo usado pela API
  dueDate?: string; // Campo usado pela API
  project_id?: number; // Campo interno no frontend
  order?: number;
  timer?: number; // Tempo em segundos
  task_reviewer_id?: number; // Campo interno no frontend
  taskReviewerId?: number; // Campo usado pela API
  video_url?: string; // URL do vídeo do YouTube
  useful_links?: Array<{title: string, url: string}>; // Links úteis
  observations?: string; // Observações detalhadas
  has_detailed_fields?: boolean; // Flag para campos detalhados
  users?: number[];
  occupations?: number[]; // Manter 'occupations' para o backend
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  start_date?: string; // Campo interno no frontend
  due_date?: string; // Campo interno no frontend
  startDate?: string; // Campo usado pela API
  dueDate?: string; // Campo usado pela API
  project_id?: number; // Campo interno no frontend
  order?: number;
  timer?: number; // Tempo em segundos
  task_reviewer_id?: number; // Campo interno no frontend
  taskReviewerId?: number; // Campo usado pela API
  video_url?: string; // URL do vídeo do YouTube
  useful_links?: Array<{title: string, url: string}>; // Links úteis
  observations?: string; // Observações detalhadas
  has_detailed_fields?: boolean; // Flag para campos detalhados
  users?: number[];
  occupations?: number[]; // Manter 'occupations' para o backend
}

// =====================================================
// COMMENT INTERFACES
// =====================================================

export interface Comment {
  id: number;
  content: string;
  task_id: number;
  user_id: number; // ID do autor
  parentId: number | null; // Para respostas aninhadas
  likesCount: number; // Contagem de curtidas
  createdAt: string; // Mudar para camelCase
  updatedAt: string; // Mudar para camelCase
  user?: User; // Objeto do autor (carregado via preload)
  repliesCount?: number; // Contagem de respostas diretas
  mentionedUsers?: User[]; // Usuários mencionados
  replies?: Comment[]; // Para respostas aninhadas pré-carregadas
}

export interface CreateCommentRequest {
  content: string;
  task_id: number;
  parentId?: number; // Adicionado para permitir respostas
}

export interface UpdateCommentRequest {
  content: string;
}

export interface UserOccupation { // Manter UserOccupation para compatibilidade com a estrutura de dados do backend
  id: number;
  user_id: number;
  occupation_id: number;
  created_at: string;
  updated_at: string;
  user?: User;
  occupation?: Team; // Renomeado Occupation para Team
}

// =====================================================
// ROLE INTERFACES
// =====================================================

export interface CreateRoleRequest {
  name: string;
  description: string;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

// =====================================================
// TEAM INTERFACES (Antigas OCCUPATION INTERFACES)
// =====================================================

export interface CreateTeamRequest { // Renomeado de CreateOccupationRequest
  name: string;
  description: string;
}

export interface UpdateTeamRequest { // Renomeado de UpdateOccupationRequest
  name?: string;
  description?: string;
}

export interface AddUserToTeamRequest { // Renomeado de AddUserToOccupationRequest
  user_id: number;
}

// =====================================================
// RECURRING TASK INTERFACES
// =====================================================

export type RecurringTaskScheduleType = 'interval' | 'cron';

export interface RecurringTaskTemplateData {
  title: string;
  description: string;
  priority: TaskPriority;
  assignee_ids: number[];
  occupation_ids?: number[]; // Added to match backend response
  occupations?: Team[]; // Added to match backend response
  task_reviewer_id?: number; // Added to match backend DTO
}

export interface RecurringTask {
  id: number;
  name: string;
  schedule_type: RecurringTaskScheduleType;
  frequency_interval: string | null;
  frequency_cron: string | null;
  next_due_date: string;
  is_active: boolean;
  userId: number;
  projectId: number;
  templateData: RecurringTaskTemplateData;
  created_at?: string;
  updated_at?: string;
}

export interface CreateRecurringTaskRequest {
  name: string;
  schedule_type: RecurringTaskScheduleType;
  frequency_interval?: string | null;
  frequency_cron?: string | null;
  next_due_date: string;
  is_active: boolean;
  userId: number;
  projectId: number;
  templateData: RecurringTaskTemplateData;
}

export interface UpdateRecurringTaskRequest {
  name?: string;
  is_active?: boolean;
  schedule_type?: RecurringTaskScheduleType;
  frequency_interval?: string | null;
  frequency_cron?: string | null;
  next_due_date?: string;
  projectId?: number;
  templateData?: Partial<RecurringTaskTemplateData>;
}

// =====================================================
// UTILITY INTERFACES
// =====================================================

// Interface Paginator genérica
export interface Paginator<T> {
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    first_page: number;
    first_page_url: string | null;
    last_page_url: string | null;
    next_page_url: string | null;
    previous_page_url: string | null;
  };
  data: T[];
}

// =====================================================
// UTILITY FUNCTIONS TYPE EXPORTS
// =====================================================

// Function types for utility functions
export type ConvertApiTaskToFrontend = (taskData: Task) => Task;

// =====================================================
// NOTIFICATION INTERFACES
// =====================================================

export interface Notification {
  id: number;
  userId: number;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  user?: User;
}