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

export interface Occupation {
  id: number;
  name: string;
  description?: string; // Tornar opcional
  created_at?: string;
  updated_at?: string;
  users?: User[]; // Adicionado para incluir usuários associados à ocupação
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
  roles?: Role[] | number[];
  occupation?: {
    id: number;
    name: string;
  };
  occupations?: Array<{
    id: number;
    name: string;
  }>;
  avatar_url?: string; // From comments interface
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  occupation_id?: number;
  roles?: number[];
  occupations?: number[];
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  occupation_id?: number;
  roles?: number[];
  occupations?: number[];
}

// =====================================================
// AUTH INTERFACES
// =====================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user_id: number;
  name: string;
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
  occupations?: Occupation[];
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
  occupations?: number[];
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  priority?: ProjectPriority;
  status?: boolean;
  start_date?: string;
  end_date?: string;
  users?: number[];
  occupations?: number[];
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
  projectId?: number; // Campo usado pela API
  order?: number;
  timer?: number; // Tempo em segundos
  created_at?: string; // Campo interno no frontend
  updated_at?: string; // Campo interno no frontend
  createdAt?: string; // Campo usado pela API
  updatedAt?: string; // Campo usado pela API
  users?: Array<number | { id: number; name: string; email: string; occupation_id?: number; occupationId?: number }>;
  occupations?: Occupation[];
  project?: Project; // Usar a interface Project importada
  comments?: Comment[]; // Adicionado para incluir comentários pré-carregados
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
  projectId?: number; // Campo usado pela API
  order?: number;
  timer?: number; // Tempo em segundos
  users?: number[];
  occupations?: number[];
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
  projectId?: number; // Campo usado pela API
  order?: number;
  timer?: number; // Tempo em segundos
  users?: number[];
  occupations?: number[];
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

export interface UserOccupation {
  id: number;
  user_id: number;
  occupation_id: number;
  created_at: string;
  updated_at: string;
  user?: User;
  occupation?: Occupation;
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
// OCCUPATION INTERFACES
// =====================================================

export interface CreateOccupationRequest {
  name: string;
  description: string;
}

export interface UpdateOccupationRequest {
  name?: string;
  description?: string;
}

export interface AddUserToOccupationRequest {
  user_id: number;
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