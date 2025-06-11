import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { CreateCommentRequest, UpdateCommentRequest, Comment } from '@/common/types'

const API_URL = 'http://localhost:3333'

const commentService = {
  async getComments(): Promise<Comment[]> {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/comment`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async getCommentsByTask(taskId: number): Promise<Comment[]> {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/comment/task/${taskId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async createComment(data: CreateCommentRequest): Promise<Comment> {
    const token = localStorage.getItem('token')
    const response = await axios.post(`${API_URL}/comment`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async updateComment(id: number, data: UpdateCommentRequest): Promise<Comment> {
    const token = localStorage.getItem('token')
    const response = await axios.put(`${API_URL}/comment/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },

  async deleteComment(id: number): Promise<void> {
    const token = localStorage.getItem('token')
    await axios.delete(`${API_URL}/comment/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },

  async likeComment(id: number): Promise<void> {
    const token = localStorage.getItem('token')
    await axios.post(`${API_URL}/comment/${id}/like`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },

  async unlikeComment(id: number): Promise<void> {
    const token = localStorage.getItem('token')
    await axios.delete(`${API_URL}/comment/${id}/like`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      queryClient.invalidateQueries({ queryKey: ['taskComments'] })
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
