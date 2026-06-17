import React, { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '@/services/backend/api'
import { getCachedSetup, setCachedSetup } from '@/utils/setupStatus'

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

  // Setup status check on public routes
  useEffect(() => {
    const currentPath = location.pathname
    const isPublicRoute = ['/login', '/setup'].includes(currentPath)

    if (!isPublicRoute) return

    const cached = getCachedSetup()
    if (cached) {
      if (cached.needsSetup && currentPath !== '/setup') {
        navigate('/setup', { replace: true })
      } else if (!cached.needsSetup && currentPath !== '/login') {
        navigate('/login', { replace: true })
      }
      return
    }

    api.get('/auth/setup-status')
      .then((res) => {
        const needsSetup = res.data.data?.needsSetup ?? res.data.needsSetup ?? false
        setCachedSetup(needsSetup)
        if (needsSetup && currentPath !== '/setup') {
          navigate('/setup', { replace: true })
        } else if (!needsSetup && currentPath !== '/login') {
          navigate('/login', { replace: true })
        }
      })
      .catch(() => {
        // On error, default to login to allow retry
        setCachedSetup(false)
      })
  }, [location.pathname])

  // Handle navigation on logout (simulating original behavior)
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      // Check if we should navigate to login
      const currentPath = location.pathname
      const isPublicRoute = ['/login', '/setup'].includes(currentPath)

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