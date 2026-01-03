import { useOptimizedQuery, useOptimisticMutation, useCacheManager } from '@/hooks/useOptimizedQuery'
import { queryKeys } from '@/lib/react-query/keys'
import { api } from '@/services/backend/api'
import { ROUTES } from '@/services/backend/routes'
import { CreateCommentRequest, UpdateCommentRequest, Comment } from '@/utils/commonTypes'
import { toast } from '@/components/ui/use-toast'
import { queryClient } from '@/lib/react-query/config'
import { transformApiCommentToFrontend } from '@/utils/apiTransformers'

const commentService = {
  async getComments(): Promise<Comment[]> {
    const response = await api.get(ROUTES.comments)
    return response.data
  },

  async getCommentsByTask(taskId: number): Promise<Comment[]> {
    // backend-2 doesn't expose /comments/task/:id; map to query param ?task=
    const response = await api.get(`${ROUTES.comments}?task=${taskId}`)
    // Aplicar transformer nos comentários
    const transformed = response.data.map(transformApiCommentToFrontend)
    return transformed
  },

  async createComment(data: CreateCommentRequest): Promise<Comment> {
    const response = await api.post(ROUTES.comments, data);
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
  useOptimizedQuery(
    queryKeys.comments.lists(),
    commentService.getComments,
    {
      onError: (error) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os comentários',
          variant: 'destructive',
        })
      },
    }
  )

export const useGetCommentsByTask = (taskId: number) =>
  useOptimizedQuery(
    queryKeys.comments.byTask(taskId),
    () => commentService.getCommentsByTask(taskId),
    {
      enabled: !!taskId,
      onError: (error) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os comentários da tarefa',
          variant: 'destructive',
        })
      },
    }
  )

export const useCreateComment = () => {
  const { setData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: (data: CreateCommentRequest) => commentService.createComment(data),

    onMutate: async (newComment) => {
      // Cancelar queries relacionadas
      await queryClient.cancelQueries({ queryKey: queryKeys.comments.lists() })
      if (newComment.taskId) {
        await queryClient.cancelQueries({
          queryKey: queryKeys.comments.byTask(newComment.taskId)
        })
      }

      // Salvar snapshots
      const previousComments = queryClient.getQueryData(queryKeys.comments.lists())
      const previousTaskComments = newComment.taskId
        ? queryClient.getQueryData(queryKeys.comments.byTask(newComment.taskId))
        : undefined

      // Adicionar comentário otimisticamente
      const optimisticComment = {
        ...newComment,
        id: Date.now(), // ID temporário
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setData(queryKeys.comments.lists(), (old: any) => [...(old || []), optimisticComment])

      if (newComment.taskId) {
        setData(
          queryKeys.comments.byTask(newComment.taskId),
          (old: any) => [...(old || []), optimisticComment]
        )
      }

      return { previousComments, previousTaskComments, newComment }
    },

    invalidateKeys: (data, variables, context) => [
      queryKeys.comments.lists(),
      ...(context?.newComment?.taskId ? [queryKeys.comments.byTask(context.newComment.taskId)] : []),
    ],

    updateCache: (createdComment) => {
      setData(queryKeys.comments.detail(createdComment.id), createdComment)
    },

    onSuccess: (createdComment) => {
      console.log('Comment created successfully:', createdComment)
      toast({
        title: 'Sucesso',
        description: 'Comentário criado com sucesso',
      })
    },

    onError: (error) => {
      console.error('Error creating comment:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o comentário',
        variant: 'destructive',
      })
    },
  })
}

export const useUpdateComment = () => {
  const { setData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCommentRequest }) =>
      commentService.updateComment(id, data),

    onMutate: async ({ id, data }) => {
      // Cancelar queries
      await queryClient.cancelQueries({ queryKey: queryKeys.comments.detail(id) })
      await queryClient.cancelQueries({ queryKey: queryKeys.comments.lists() })

      // Snapshots
      const previousComment = queryClient.getQueryData(queryKeys.comments.detail(id))
      const previousComments = queryClient.getQueryData(queryKeys.comments.lists())

      // Atualização otimista
      setData(queryKeys.comments.detail(id), (old: any) => ({
        ...old,
        ...data,
        updatedAt: new Date().toISOString(),
      }))

      setData(queryKeys.comments.lists(), (old: any[]) =>
        old?.map(comment =>
          comment.id === id ? { ...comment, ...data, updatedAt: new Date().toISOString() } : comment
        ) || []
      )

      // Se o comentário pertence a uma tarefa, atualizar também os comentários da tarefa
      if (previousComment?.taskId) {
        await queryClient.cancelQueries({
          queryKey: queryKeys.comments.byTask(previousComment.taskId)
        })
        setData(queryKeys.comments.byTask(previousComment.taskId), (old: any[]) =>
          old?.map(comment =>
            comment.id === id ? { ...comment, ...data, updatedAt: new Date().toISOString() } : comment
          ) || []
        )
      }

      return { previousComment, previousComments }
    },

    invalidateKeys: [
      queryKeys.comments.lists(),
    ],

    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Comentário atualizado com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o comentário',
        variant: 'destructive',
      })
    },
  })
}

export const useDeleteComment = () => {
  const { setData, removeData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: (id: number) => commentService.deleteComment(id),

    onMutate: async (id) => {
      const comment = queryClient.getQueryData(queryKeys.comments.detail(id))

      // Remover otimisticamente
      setData(queryKeys.comments.lists(), (old: any[]) =>
        old?.filter(c => c.id !== id) || []
      )

      // Se o comentário pertence a uma tarefa, remover também dos comentários da tarefa
      if (comment?.taskId) {
        await queryClient.cancelQueries({
          queryKey: queryKeys.comments.byTask(comment.taskId)
        })
        setData(queryKeys.comments.byTask(comment.taskId), (old: any[]) =>
          old?.filter(c => c.id !== id) || []
        )
      }

      // Remover do cache individual
      removeData(queryKeys.comments.detail(id))

      return { deletedComment: comment }
    },

    invalidateKeys: [
      queryKeys.comments.lists(),
    ],

    onSuccess: (_, id) => {
      toast({
        title: 'Sucesso',
        description: 'Comentário excluído com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o comentário',
        variant: 'destructive',
      })
    },
  })
}

export const useLikeComment = () => {
  return useOptimisticMutation({
    mutationFn: (id: number) => commentService.likeComment(id),

    invalidateKeys: [
      queryKeys.comments.lists(),
    ],

    onSuccess: (_, id) => {
      toast({
        title: 'Sucesso',
        description: 'Comentário curtido com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível curtir o comentário',
        variant: 'destructive',
      })
    },
  })
}

export const useUnlikeComment = () => {
  return useOptimisticMutation({
    mutationFn: (id: number) => commentService.unlikeComment(id),

    invalidateKeys: [
      queryKeys.comments.lists(),
    ],

    onSuccess: (_, id) => {
      toast({
        title: 'Sucesso',
        description: 'Like removido com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o like',
        variant: 'destructive',
      })
    },
  })
}
