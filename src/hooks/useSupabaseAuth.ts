import { useState, useEffect, useCallback, useRef } from 'react'
import type { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { authStorage } from '@/lib/auth-storage'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  error: AuthError | null
}

export function useSupabaseAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get initial session — triggers refresh if refresh token is valid
        const { data: { session }, error } = await supabase.auth.getSession()
        setState({
          session,
          user: session?.user ?? null,
          loading: false,
          error: error ?? null,
        })
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err,
        }))
      }
    }

    initAuth()

    // Listen for auth state changes and token refresh
    // Supabase automatically handles refresh token flow through onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // 'SIGNED_IN' — user signed in or session restored/refreshed
        // 'SIGNED_OUT' — user signed out
        // 'TOKEN_REFRESHED' — tokens were automatically refreshed
        // 'USER_UPDATED' — user profile changed
        setState((prev) => ({
          ...prev,
          session,
          user: session?.user ?? null,
          error: null,
        }))

        // Update stored tokens if session is valid
        if (session?.access_token) {
          try {
            authStorage.setAccessToken(session.access_token)
            if (session.refresh_token) {
              authStorage.setRefreshToken(session.refresh_token)
            }
            if (session.expires_at) {
              authStorage.setExpiresAt(session.expires_at * 1000)
            }
          } catch (e) {
            console.warn('Failed to store auth tokens:', e)
          }
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // Proactive token refresh — checks every 60s, refreshes if within 5 min of expiry
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const checkAndRefresh = async () => {
      if (!authStorage.isAuthenticated()) return
      if (!authStorage.shouldRefreshToken()) return

      try {
        const { data, error } = await supabase.auth.refreshSession()
        if (error) {
          console.warn('Proactive token refresh failed:', error.message)
          return
        }
        if (data.session?.access_token) {
          authStorage.setAccessToken(data.session.access_token)
          if (data.session.refresh_token) {
            authStorage.setRefreshToken(data.session.refresh_token)
          }
          if (data.session.expires_at) {
            authStorage.setExpiresAt(data.session.expires_at * 1000)
          }
        }
      } catch (e) {
        console.warn('Token refresh error:', e)
      }
    }

    refreshTimerRef.current = setInterval(checkAndRefresh, 60 * 1000)

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          setState((prev) => ({ ...prev, error, loading: false }))
          throw error
        }

        // Store all tokens via centralized auth storage
        if (data.session?.access_token) {
          authStorage.setAccessToken(data.session.access_token)
          if (data.session.refresh_token) {
            authStorage.setRefreshToken(data.session.refresh_token)
          }
          if (data.session.expires_at) {
            authStorage.setExpiresAt(data.session.expires_at * 1000)
          }
        }

        setState({
          session: data.session,
          user: data.user,
          loading: false,
          error: null,
        })
        return data
      } catch (err: any) {
        setState((prev) => ({ ...prev, loading: false, error: err }))
        throw err
      }
    },
    []
  )

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }))
    try {
      await supabase.auth.signOut()
      setState({
        session: null,
        user: null,
        loading: false,
        error: null,
      })
    } catch (err: any) {
      setState((prev) => ({ ...prev, loading: false, error: err }))
      throw err
    }
  }, [])

  return {
    session: state.session,
    user: state.user,
    loading: state.loading,
    error: state.error,
    login,
    logout,
    supabase,
  }
}
