import api from './axios';

export type ProjectPriority = 'baixa' | 'media' | 'alta' | 'urgente';

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
  occupations?: Array<number | { id: number; name: string; createdAt?: string; updatedAt?: string }>;
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

const projectService = {
  // Listar todos os projetos
  getProjects: async () => {
    const response = await api.get<Project[]>('/project');
    // Converter os nomes dos campos da API para o formato usado no frontend
    return response.data.map(convertApiProjectToFrontend);
  },

  // Obter um projeto específico
  getProject: async (id: number) => {
    const response = await api.get<Project>(`/project/${id}`);

    // Verificar se o projeto tem tarefas
    if (response.data.tasks) {

      // Verificar tarefas atrasadas
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const atrasadas = response.data.tasks.filter(t => {
        if (!t.dueDate) return false;
        const dueDate = new Date(t.dueDate);
        return dueDate < today && t.status !== 'concluido';
      });
    }

    // Converter os nomes dos campos da API para o formato usado no frontend
    const convertedProject = convertApiProjectToFrontend(response.data);
    return convertedProject;
  },

  // Obter as ocupações (equipes) de um projeto específico
  getProjectOccupations: async (projectId: number) => {
    try {
      // Buscar o projeto com suas ocupações
      const project = await projectService.getProject(projectId);

      if (project && project.occupations && Array.isArray(project.occupations)) {
        // Formatar as ocupações para o formato de equipes
        return project.occupations.map(occ => {
          if (typeof occ === 'number') {
            return { id: occ, name: `Equipe ${occ}` };
          } else {
            return {
              id: occ.id,
              name: occ.name,
              created_at: occ.createdAt || occ.created_at,
              updated_at: occ.updatedAt || occ.updated_at
            };
          }
        });
      }

      return [];
    } catch (error) {
      return [];
    }
  },

  // Criar um novo projeto
  createProject: async (projectData: CreateProjectRequest) => {
    // Converter os nomes dos campos do frontend para o formato usado pela API
    const apiProjectData: any = { ...projectData };

    // Manter os campos start_date e end_date como estão
    // O backend espera start_date e end_date, não startDate e endDate

    const response = await api.post<Project>('/project', apiProjectData);
    // Converter os nomes dos campos da API para o formato usado no frontend
    return convertApiProjectToFrontend(response.data);
  },

  // Atualizar um projeto existente
  updateProject: async (id: number, projectData: UpdateProjectRequest) => {
    // Converter os nomes dos campos do frontend para o formato usado pela API
    const apiProjectData: any = { ...projectData };

    // Manter os campos start_date e end_date como estão
    // O backend espera start_date e end_date, não startDate e endDate

    const response = await api.put<Project>(`/project/${id}`, apiProjectData);
    // Converter os nomes dos campos da API para o formato usado no frontend
    return convertApiProjectToFrontend(response.data);
  },

  // Excluir um projeto
  deleteProject: async (id: number) => {
    const response = await api.delete(`/project/${id}`);
    return response.data;
  }
};

// Função utilitária para converter os nomes dos campos da API para o formato usado no frontend
export const convertApiProjectToFrontend = (projectData: Project): Project => {
  // Criar uma cópia do objeto para não modificar o original
  const convertedProject: Project = {
    ...projectData,
    // Converter startDate para start_date
    start_date: projectData.startDate || projectData.start_date,
    // Converter endDate para end_date
    end_date: projectData.endDate || projectData.end_date,
    // Converter createdAt para created_at
    created_at: projectData.createdAt || projectData.created_at,
    // Converter updatedAt para updated_at
    updated_at: projectData.updatedAt || projectData.updated_at,
  };

  // Preservar os relacionamentos
  if (projectData.users) {
    convertedProject.users = projectData.users;
  }

  if (projectData.occupations) {
    convertedProject.occupations = projectData.occupations;
  }

  if (projectData.tasks) {
    // Converter as tarefas para o formato usado no frontend
    convertedProject.tasks = projectData.tasks.map(task => {
      // Verificar se a tarefa tem dueDate e convertê-lo para due_date
      if (task.dueDate && !task.due_date) {
        return {
          ...task,
          due_date: task.dueDate
        };
      }
      return task;
    });
  }

  return convertedProject;
};

export default projectService;
