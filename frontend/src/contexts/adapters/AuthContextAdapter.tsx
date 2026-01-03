import React, { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate, useLocation } from 'react-router-dom'

// Hook adaptador para manter a mesma API do AuthContext
export const useAuth = () => {
  const {
    user,
    accessToken,
    refreshToken,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshAuthToken
  } = useAuthStore()

  const navigate = useNavigate()
  const location = useLocation()

  // Handle navigation on logout (simulating original behavior)
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      // Check if we should navigate to login
      const currentPath = location.pathname
      const isPublicRoute = ['/login', '/register'].includes(currentPath)

      if (!isPublicRoute && currentPath !== '/') {
        navigate('/login')
      }
    }
  }, [isAuthenticated, isLoading, navigate, location.pathname])

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshAuthToken
  }
}