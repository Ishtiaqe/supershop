import { useState, useEffect, useCallback } from 'react'
import type { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

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

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setState((prev) => ({
          ...prev,
          session,
          user: session?.user ?? null,
          error: null,
        }))
      }
    )

    return () => {
      subscription?.unsubscribe()
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

        // Store access token in localStorage for API requests
        if (data.session?.access_token) {
          localStorage.setItem('accessToken', data.session.access_token)
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
