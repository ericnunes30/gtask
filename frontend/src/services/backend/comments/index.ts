import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import commentService, {
  CreateCommentRequest,
  UpdateCommentRequest,
} from '@/lib/api/comments'

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
    mutationFn: ({ id, data }: MutateCommentArgs) =>
      id
        ? commentService.updateComment(id, data as UpdateCommentRequest)
        : commentService.createComment(data as CreateCommentRequest),
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
