import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Task, CreateTaskRequest, UpdateTaskRequest } from '@/common/types'
import { transformApiTaskToFrontend } from '@/utils/apiTransformers'
import API_URL from '@/services/api'

const taskService = {
  async getTasks(): Promise<Task[]> {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/task`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data.map(transformApiTaskToFrontend)
  },

  async getTask(id: number): Promise<Task> {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/task/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return transformApiTaskToFrontend(response.data)
  },

  async getTasksByProject(projectId: number): Promise<Task[]> {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/task?project_id=${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data.map(transformApiTaskToFrontend)
  },

  async createTask(data: CreateTaskRequest): Promise<Task> {
    const token = localStorage.getItem('token')
    const response = await axios.post(`${API_URL}/task`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return transformApiTaskToFrontend(response.data)
  },

  async updateTask(id: number, data: UpdateTaskRequest): Promise<Task> {
    const token = localStorage.getItem('token')
    const response = await axios.put(`${API_URL}/task/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return transformApiTaskToFrontend(response.data)
  },

  async deleteTask(id: number): Promise<void> {
    const token = localStorage.getItem('token')
    await axios.delete(`${API_URL}/task/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },
}

export const useGetTasks = () =>
  useQuery({ queryKey: ['tasks'], queryFn: taskService.getTasks })

export const useGetTask = (taskId: number) =>
  useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskService.getTask(taskId),
  })

export const useGetTasksByProject = (projectId: number, enabled = true) =>
  useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: () => taskService.getTasksByProject(projectId),
    enabled,
  })

export const useCreateTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskRequest) => taskService.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] })
    },
  })
}

export const useUpdateTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskRequest }) =>
      taskService.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task'] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] })
    },
  })
}

export const useDeleteTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => taskService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task'] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] })
    },
  })
}
