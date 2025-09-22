import { useOptimisticMutation, useCacheManager, useQueryClient } from '@/hooks/useOptimizedQuery'
import { queryKeys } from '@/lib/react-query/keys'
import { UpdateUserRequest, User } from '@/common/types'
import { userService } from '@/services/backend/users'
import { toast } from '@/components/ui/use-toast'

const profileService = {
  async updateProfile(userId: number, data: UpdateUserRequest): Promise<User> {
    return userService.updateUser(userId, data)
  },
  async changePassword(userId: number, newPassword: string): Promise<void> {
    await userService.updateUser(userId, { password: newPassword })
  },
}

export const useUpdateProfile = () => {
  const { setData } = useCacheManager()

  return useOptimisticMutation({
    mutationFn: (params: { userId: number; data: UpdateUserRequest }) =>
      profileService.updateProfile(params.userId, params.data),

    onMutate: async ({ userId, data }) => {
      // Cancelar queries relacionadas
      await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(userId) })
      await queryClient.cancelQueries({ queryKey: queryKeys.users.lists() })
      await queryClient.cancelQueries({ queryKey: queryKeys.users.currentUser })

      // Snapshots
      const previousUser = queryClient.getQueryData(queryKeys.users.detail(userId))
      const previousUsers = queryClient.getQueryData(queryKeys.users.lists())
      const previousCurrentUser = queryClient.getQueryData(queryKeys.users.currentUser)

      // Atualização otimista
      setData(queryKeys.users.detail(userId), (old: any) => ({
        ...old,
        ...data,
        updatedAt: new Date().toISOString(),
      }))

      setData(queryKeys.users.lists(), (old: any[]) =>
        old?.map(user =>
          user.id === userId ? { ...user, ...data, updatedAt: new Date().toISOString() } : user
        ) || []
      )

      // Atualizar também o usuário atual se for o mesmo
      setData(queryKeys.users.currentUser, (old: any) => ({
        ...old,
        ...data,
        updatedAt: new Date().toISOString(),
      }))

      return { previousUser, previousUsers, previousCurrentUser }
    },

    invalidateKeys: [
      queryKeys.users.lists(),
      ['currentUser'],
    ],

    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil',
        variant: 'destructive',
      })
    },
  })
}

export const useChangePassword = () => {
  return useOptimisticMutation({
    mutationFn: (params: { userId: number; newPassword: string }) =>
      profileService.changePassword(params.userId, params.newPassword),

    invalidateKeys: [
      queryKeys.users.currentUser,
    ],

    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Senha alterada com sucesso',
      })
    },

    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar a senha',
        variant: 'destructive',
      })
    },
  })
}
