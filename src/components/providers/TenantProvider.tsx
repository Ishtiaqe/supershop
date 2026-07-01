'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { authStorage } from '@/lib/auth-storage'

interface TenantContextType {
  currentTenantId: string | null
  setTenantId: (tenantId: string) => void
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within TenantProvider')
  return ctx
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null)

  // Initialize tenant ID from localStorage on mount
  useEffect(() => {
    try {
      const tenant = authStorage.getTenant()
      if (tenant?.id) {
        setCurrentTenantId(tenant.id)
      }
    } catch (e) {
      console.warn('Failed to restore tenant ID from localStorage:', e)
    }
  }, [])

  // Listen for tenant changes in localStorage (syncs with AuthProvider)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const tenant = authStorage.getTenant()
        if (tenant?.id) {
          setCurrentTenantId(tenant.id)
        } else {
          setCurrentTenantId(null)
        }
      } catch (e) {
        console.warn('Failed to sync tenant ID from localStorage:', e)
      }
    }

    // Listen for storage events (for cross-tab sync)
    window.addEventListener('storage', handleStorageChange)

    // Also check periodically for auth changes (for same-tab sync)
    const interval = setInterval(handleStorageChange, 1000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  const setTenantId = (tenantId: string) => {
    setCurrentTenantId(tenantId)
  }

  const value = React.useMemo(
    () => ({
      currentTenantId,
      setTenantId,
    }),
    [currentTenantId]
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}
