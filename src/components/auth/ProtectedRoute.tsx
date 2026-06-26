'use client'

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallbackPath?: string
}

export function ProtectedRoute({
  children,
  fallbackPath = '/login',
}: ProtectedRouteProps) {
  const { user, loading } = useSupabaseAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!user) {
      navigate(fallbackPath)
    }
  }, [user, loading, navigate, fallbackPath])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
