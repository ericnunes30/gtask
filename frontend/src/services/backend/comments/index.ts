import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import { CreateCommentRequest, UpdateCommentRequest, Comment } from '@/common/types'

const commentService = {
  async getComments(): Promise<Comment[]> {
    const response = await api.get(ROUTES.comments)
    return response.data
  },

  async getCommentsByTask(taskId: number): Promise<Comment[]> {
    // backend-2 doesn't expose /comments/task/:id; map to query param ?task=
    const response = await api.get(`${ROUTES.comments}?task=${taskId}`)
    return response.data
  },

  async createComment(data: CreateCommentRequest): Promise<Comment> {
    console.log('Sending create comment request with data:', data);
    const response = await api.post(ROUTES.comments, data);
    console.log('Received create comment response (raw):', response); // Log da resposta completa
    console.log('Received create comment response (data):', response.data); // Log de response.data
    console.log('Received create comment response (data.data):', response.data.data); // Log de response.data.data
            return response.data.data; // <-- CORRIGIDO
  },

  async updateComment(id: number, data: UpdateCommentRequest): Promise<Comment> {
    const response = await api.put(`${ROUTES.comments}/${id}`, data)
    return response.data
  },

  async deleteComment(id: number): Promise<void> {
    await api.delete(`${ROUTES.comments}/${id}`)
  },

  async likeComment(id: number): Promise<void> {
    await api.post(`${ROUTES.comments}/${id}/like`, {})
  },

  async unlikeComment(id: number): Promise<void> {
    await api.delete(`${ROUTES.comments}/${id}/like`)
  },
}

export const useGetComments = () =>
  useQuery({ queryKey: ['comments'], queryFn: commentService.getComments })

export const useGetCommentsByTask = (taskId: number) =>
  useQuery({
    queryKey: ['taskComments', taskId],
    queryFn: () => commentService.getCommentsByTask(taskId),
  })

interface MutateCommentArgs {
  id?: number
  data: CreateCommentRequest | UpdateCommentRequest
}

export const useCreateComment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCommentRequest) => commentService.createComment(data),
    onSuccess: (newComment) => {
      console.log('Comment created successfully:', newComment);
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['taskComments'] });
    },
    onError: (error) => {
      console.error('Error creating comment:', error);
    },
  })
}

export const useUpdateComment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCommentRequest }) =>
      commentService.updateComment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      queryClient.invalidateQueries({ queryKey: ['taskComments'] })
    },
  })
}

export const useDeleteComment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => commentService.deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      queryClient.invalidateQueries({ queryKey: ['taskComments'] })
    },
  })
}

export const useLikeComment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => commentService.likeComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      queryClient.invalidateQueries({ queryKey: ['taskComments'] })
    },
  })
}

export const useUnlikeComment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => commentService.unlikeComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      queryClient.invalidateQueries({ queryKey: ['taskComments'] })
    },
  })
}
