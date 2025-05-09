import api from './axios';

// É importante que uma interface User esteja disponível, seja importada de outro lugar ou definida aqui.
// Exemplo de uma interface User básica, ajuste conforme necessário.
export interface User {
  id: number;
  name: string; // ou username, fullName, etc.
  avatar_url?: string; // Exemplo
}

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
  replies?: Comment[]; // Para respostas aninhadas pr��-carregadas (usa o nome da interface local)
}

// Interface Paginator genérica (ajuste ou mova para um arquivo de tipos globais se necessário)
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

export interface CreateCommentRequest {
  content: string;
  task_id: number;
  parentId?: number; // Adicionado para permitir respostas
}

export interface UpdateCommentRequest {
  content: string;
}

const commentService = {
  // Listar todos os comentários
  getComments: async () => {
    const response = await api.get<Comment[]>('/comment');
    return response.data;
  },

  // Obter um comentário específico
  getComment: async (id: number) => {
    const response = await api.get<Comment>(`/comment/${id}`);
    return response.data;
  },

  // Criar um novo comentário
  createComment: async (commentData: CreateCommentRequest) => {
    const response = await api.post<Comment>('/comment', commentData);
    return response.data;
  },

  // Atualizar um comentário existente
  updateComment: async (id: number, commentData: UpdateCommentRequest) => {
    const response = await api.put<Comment>(`/comment/${id}`, commentData);
    return response.data;
  },

  // Excluir um comentário
  deleteComment: async (id: number) => {
    const response = await api.delete(`/comment/${id}`);
    return response.data;
  },

  // Obter comentários de uma tarefa específica (paginado pelo backend)
  getCommentsByTask: async (taskId: number, page: number = 1, limit: number = 10) => { // Adiciona paginação opcional
    // Ajusta a rota para corresponder ao backend e espera um Paginator
    const response = await api.get<Paginator<Comment>>(`/comment/task/${taskId}`, {
      params: { page, limit } // Envia parâmetros de paginação
    });
    // Retorna apenas o array de dados do paginador
    // TODO: Considerar retornar o objeto Paginator completo se a UI precisar de informações de paginação
    return response.data.data;
  },

  // Curtir um comentário
  likeComment: async (commentId: number) => {
    // O backend retorna 201 com { message: '...' } ou 204 se j�� curtido (ou outro status de sucesso)
    // O tipo de retorno pode ser ajustado se a resposta do backend for mais específica
    const response = await api.post(`/comment/${commentId}/like`);
    return response.data; // ou response.status se não houver corpo na resposta de sucesso
  },

  // Descurtir um comentário
  unlikeComment: async (commentId: number) => {
    // O backend retorna 204 (No Content)
    await api.delete(`/comment/${commentId}/like`);
    // Não há corpo de resposta para retornar
  },

  // Obter respostas de um comentário específico (paginado)
  getCommentReplies: async (commentId: number, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (page) {
      params.append('page', page.toString());
    }
    if (limit) {
      params.append('limit', limit.toString());
    }
    const response = await api.get<Paginator<Comment>>(`/comment/${commentId}/replies`, { params });
    return response.data;
  }
};

export default commentService;
