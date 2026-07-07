'use client'

import React, { useEffect, useMemo, useCallback, useRef } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { authStorage, sessionStorageWithTTL } from '@/lib/auth-storage'
import { masterDataCache } from '@/lib/cache/masterData'
import { clearTenantQueries } from '@/components/providers'
import api from '@/lib/api'

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
  const cachedProfileRef = useRef(cachedProfile)
  const [profileLoading, setProfileLoading] = React.useState(false)
  const lastFetchedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    cachedProfileRef.current = cachedProfile
  }, [cachedProfile])

  // Loading is true while Supabase auth is initializing OR while we are resolving
  // the full profile for an authenticated Supabase user. This prevents auth guards
  // from redirecting to /login during the gap between "Supabase user confirmed"
  // and "cached profile populated".
  const loading = supabaseLoading || profileLoading || (!cachedProfile && !!supabaseUser)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Wait for Supabase auth check to complete
        if (supabaseLoading) {
          return
        }

        // If Supabase confirms no user, clear the profile only when we had a
        // cached profile (i.e. an actual sign-out). This avoids wiping the cached
        // user during transient errors or race conditions on reload.
        if (!supabaseUser) {
          if (cachedProfileRef.current) {
            setCachedProfile(null)
            authStorage.setUser(null as any)
            authStorage.setTenant(null as any)
            lastFetchedUserIdRef.current = null
          }
          return
        }

        // Skip fetch if we already have a profile for this user ID
        // This prevents unnecessary re-fetching on tab switch (TOKEN_REFRESHED events)
        if (lastFetchedUserIdRef.current === supabaseUser.id && cachedProfileRef.current) {
          return
        }

        setProfileLoading(true)

        // Fetch full profile from Supabase using user ID (more private than email)
        let queryResult = await supabase
          .from('users')
          .select('*, tenant:tenants(*)')
          .eq('id', supabaseUser.id)
          .single()

        if (queryResult.error) {
          console.warn('Query by ID failed, trying query by email:', queryResult.error)
          queryResult = await supabase
            .from('users')
            .select('*, tenant:tenants(*)')
            .eq('email', supabaseUser.email)
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
          // Track that we've fetched this user's profile
          lastFetchedUserIdRef.current = supabaseUser.id

          // Detect tenant change: if the new profile's tenant differs from the
          // currently cached one, clear ALL caches from the previous tenant.
          const prevTenantId = cachedProfileRef.current?.tenant?.id || authStorage.getTenant()?.id
          const newTenantId = data.tenant?.id
          if (prevTenantId && newTenantId && prevTenantId !== newTenantId) {
            try {
              await masterDataCache.invalidateTenant(prevTenantId)
            } catch (e) {
              console.error('Failed to clear previous tenant IndexedDB cache:', e)
            }
            try {
              api.clearCache(prevTenantId)
            } catch (e) {
              console.error('Failed to clear previous tenant API cache:', e)
            }
            try {
              const queryClient = (window as any).__queryClient
              if (queryClient) {
                clearTenantQueries(queryClient, prevTenantId)
                // Also clear any non-tenant-prefixed queries that might leak
                queryClient.invalidateQueries({ queryKey: ['inventory'] })
                queryClient.invalidateQueries({ queryKey: ['catalog'] })
                queryClient.invalidateQueries({ queryKey: ['shortlist'] })
              }
            } catch (e) {
              console.error('Failed to clear previous tenant query cache:', e)
            }
            try {
              // Clear all POS sessionStorage cache entries
              for (let i = sessionStorage.length - 1; i >= 0; i--) {
                const key = sessionStorage.key(i)
                if (key && key.startsWith('pos-inventory:')) {
                  sessionStorage.removeItem(key)
                }
              }
            } catch (e) {
              console.error('Failed to clear sessionStorage:', e)
            }
          }

          setCachedProfile(data)
          authStorage.setUser(data)
          if (data.tenant) {
            authStorage.setTenant(data.tenant)
          }
        }
      } catch (e) {
        console.warn('Failed to fetch user profile:', e)
        // Keep the cached profile if we already have one; do not log the user out
        // just because a profile refresh failed.
        if (!cachedProfileRef.current) {
          setCachedProfile(null)
        }
      } finally {
        setProfileLoading(false)
      }
    }

    fetchProfile()
  }, [supabaseUser, supabase, supabaseLoading])

  // Simplified refresh: Supabase handles token refresh automatically
  const refresh = useCallback(async (): Promise<any> => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return null

      // Query by user ID first (more private than email)
      let queryResult = await supabase
        .from('users')
        .select('*, tenant:tenants(*)')
        .eq('id', currentUser.id)
        .single()

      if (queryResult.error) {
        queryResult = await supabase
          .from('users')
          .select('*, tenant:tenants(*)')
          .eq('email', currentUser.email)
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
    // Get current tenant ID before clearing auth
    const currentTenantId = cachedProfile?.tenant?.id || authStorage.getTenant()?.id

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

    // Clear tenant-specific caches
    if (currentTenantId) {
      try {
        // Clear IndexedDB data for current tenant
        await masterDataCache.invalidateTenant(currentTenantId)
      } catch (e) {
        console.error('Failed to clear tenant IndexedDB cache:', e)
      }

      try {
        // Clear TanStack Query queries for current tenant
        const queryClient = (window as any).__queryClient
        if (queryClient) {
          clearTenantQueries(queryClient, currentTenantId)
        }
      } catch (e) {
        console.error('Failed to clear tenant query cache:', e)
      }

      try {
        // Clear API cache for current tenant
        api.clearCache(currentTenantId)
      } catch (e) {
        console.error('Failed to clear tenant API cache:', e)
      }
    }

    // Clear expired sessionStorage items (preserve valid items)
    try {
      sessionStorageWithTTL.clearExpiredSessionItems()
    } catch (e) {
      console.error('Failed to clear expired sessionStorage:', e)
    }

    // Clear cached profile
    setCachedProfile(null)

    // The Shell's auth guard will redirect to /login once it sees the user is
    // gone. Avoiding a hard reload here prevents a double navigation and keeps
    // the logout experience fast.
  }, [supabaseLogout, cachedProfile])

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
