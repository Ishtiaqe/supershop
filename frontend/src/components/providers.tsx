'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { ConfigProvider, theme as antdTheme } from 'antd'
import React, { useEffect } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'

const ThemeContext = React.createContext({
  mode: 'system' as ThemeMode,
  // noop
  setMode: (() => {}) as (m: ThemeMode) => void,
})

export function useTheme() {
  return React.useContext(ThemeContext)
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  )

  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light'
    return (localStorage.getItem('theme') as ThemeMode) || 'system'
  })

  useEffect(() => {
    if (mode === 'system') {
      localStorage.removeItem('theme')
    } else {
      localStorage.setItem('theme', mode)
    }
  }, [mode])

  // Determine antd algorithm
  const prefersDark = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark)

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      <ConfigProvider
        theme={{ algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }}
      >
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}
