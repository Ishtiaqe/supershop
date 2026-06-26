'use client'

import React, { useEffect, useMemo, useCallback } from 'react'
import api from '@/lib/api'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

export type AuthContextType = {
  user: any | null
  loading: boolean
  refresh: () => Promise<any>
  logout: () => Promise<void>
  login: (user: any) => void
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: supabaseUser, logout: supabaseLogout } = useSupabaseAuth()

  // Fetch and cache user profile from backend (includes tenant info)
  const [cachedProfile, setCachedProfile] = React.useState<any | null>(null)
  const [loading, setLoading] = React.useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!supabaseUser) {
          setCachedProfile(null)
          setLoading(false)
          return
        }

        // Fetch full profile from backend (includes tenant, role, etc.)
        const resp = await api.get('/users/me')
        if (resp?.data) {
          setCachedProfile(resp.data)
          try {
            localStorage.setItem('user', JSON.stringify(resp.data))
            if (resp.data?.tenant) {
              localStorage.setItem('tenant', JSON.stringify(resp.data.tenant))
            }
          } catch {}
        }
      } catch (e) {
        console.warn('Failed to fetch user profile:', e)
        setCachedProfile(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [supabaseUser])

  // Simplified refresh: Supabase handles token refresh automatically
  const refresh = useCallback(async (): Promise<any> => {
    try {
      const resp = await api.get('/users/me')
      if (resp?.data) {
        setCachedProfile(resp.data)
        return resp.data
      }
    } catch (e) {
      console.warn('Profile refresh failed:', e)
    }
    return null
  }, [])

  const logout = useCallback(async () => {
    try {
      // Use Supabase logout (handles token cleanup)
      await supabaseLogout()
    } catch (e) {
      console.error('Supabase logout failed:', e)
    }

    // Clear local storage
    try {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
      localStorage.removeItem('tenant')
    } catch {}

    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }, [supabaseLogout])

  const login = useCallback((userData: any) => {
    setCachedProfile(userData)
  }, [])

  const value = useMemo<AuthContextType>(
    () => ({
      user: cachedProfile,
      loading,
      refresh,
      logout,
      login,
    }),
    [cachedProfile, loading, refresh, logout, login]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
