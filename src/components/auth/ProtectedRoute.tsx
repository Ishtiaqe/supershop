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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}
