'use client'

import React, { useEffect, useMemo, useCallback } from 'react'
import api from '@/lib/api'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { authStorage } from '@/lib/auth-storage'

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
  const { user: supabaseUser, logout: supabaseLogout, supabase, loading: supabaseLoading } = useSupabaseAuth()

  // Initialize from localStorage for instant auth check
  const [cachedProfile, setCachedProfile] = React.useState<any | null>(() => {
    return authStorage.getUser()
  })

  // Loading is only true if we have no cached profile AND Supabase is still loading
  // If we have a cached profile, we consider auth as "loaded" instantly
  const loading = !cachedProfile && supabaseLoading

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Wait for Supabase auth check to complete
        if (supabaseLoading) {
          return
        }

        // If Supabase confirms no user, clear the profile
        if (!supabaseUser) {
          setCachedProfile(null)
          authStorage.setUser(null as any)
          authStorage.setTenant(null as any)
          return
        }

        // Fetch full profile from Supabase directly using email (to handle user ID mismatches)
        let queryResult = await supabase
          .from('users')
          .select('*, tenant:tenants(*)')
          .eq('email', supabaseUser.email)
          .single()

        if (queryResult.error) {
          console.warn('Query by email failed, trying query by ID:', queryResult.error)
          queryResult = await supabase
            .from('users')
            .select('*, tenant:tenants(*)')
            .eq('id', supabaseUser.id)
            .single()
        }

        const { data, error } = queryResult

        if (error) {
          console.warn('Failed to query user profile from Supabase DB, falling back to metadata:', error)
          const fallbackProfile = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            fullName: supabaseUser.user_metadata?.full_name || 'User',
            role: supabaseUser.user_metadata?.role || 'OWNER',
            tenantId: supabaseUser.user_metadata?.tenantId || 'default-tenant',
            tenant: {
              id: supabaseUser.user_metadata?.tenantId || 'default-tenant',
              name: supabaseUser.user_metadata?.tenantName || 'Demo Shop',
              status: 'ACTIVE'
            }
          }
          setCachedProfile(fallbackProfile)
          authStorage.setUser(fallbackProfile)
          authStorage.setTenant(fallbackProfile.tenant)
          return
        }

        if (data) {
          setCachedProfile(data)
          authStorage.setUser(data)
          if (data.tenant) {
            authStorage.setTenant(data.tenant)
          }
        }
      } catch (e) {
        console.warn('Failed to fetch user profile:', e)
        setCachedProfile(null)
      }
    }

    fetchProfile()
  }, [supabaseUser, supabase, supabaseLoading])

  // Simplified refresh: Supabase handles token refresh automatically
  const refresh = useCallback(async (): Promise<any> => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return null

      let queryResult = await supabase
        .from('users')
        .select('*, tenant:tenants(*)')
        .eq('email', currentUser.email)
        .single()

      if (queryResult.error) {
        queryResult = await supabase
          .from('users')
          .select('*, tenant:tenants(*)')
          .eq('id', currentUser.id)
          .single()
      }

      const { data, error } = queryResult

      if (error) {
        console.warn('Profile refresh query failed, using metadata fallback:', error)
        const fallbackProfile = {
          id: currentUser.id,
          email: currentUser.email,
          fullName: currentUser.user_metadata?.full_name || 'User',
          role: currentUser.user_metadata?.role || 'OWNER',
          tenantId: currentUser.user_metadata?.tenantId || 'default-tenant',
          tenant: {
            id: currentUser.user_metadata?.tenantId || 'default-tenant',
            name: currentUser.user_metadata?.tenantName || 'Demo Shop',
            status: 'ACTIVE'
          }
        }
        setCachedProfile(fallbackProfile)
        return fallbackProfile
      }

      if (data) {
        setCachedProfile(data)
        return data
      }
    } catch (e) {
      console.warn('Profile refresh failed:', e)
    }
    return null
  }, [supabase])

  const logout = useCallback(async () => {
    try {
      // Use Supabase logout (handles token cleanup)
      await supabaseLogout()
    } catch (e) {
      console.error('Supabase logout failed:', e)
    }

    // Clear auth data via centralized module
    try {
      authStorage.clearAuth()
      // Also clear any Supabase session storage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key)
        }
      })
    } catch (e) {
      console.error('Failed to clear localStorage:', e)
    }

    // Clear cached profile
    setCachedProfile(null)

    // Redirect to login using window.location for hard refresh
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
