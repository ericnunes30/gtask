import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { UpdateUserRequest, User } from '@/common/types'
import API_URL from '@/services/api'

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
  confirm_password: string
}

const profileService = {
  async updateProfile(data: UpdateUserRequest): Promise<User> {
    const token = localStorage.getItem('token')
    const response = await axios.put(`${API_URL}/profile`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    const token = localStorage.getItem('token')
    await axios.put(`${API_URL}/profile/password`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },
}

export const useUpdateProfile = () =>
  useMutation({ mutationFn: (data: UpdateUserRequest) => profileService.updateProfile(data) })

export const useChangePassword = () =>
  useMutation({ mutationFn: (data: ChangePasswordRequest) => profileService.changePassword(data) })
