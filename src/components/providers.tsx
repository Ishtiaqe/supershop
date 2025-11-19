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

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement
    if (mode === 'dark') {
      root.classList.remove('light')
      root.classList.add('dark')
    } else if (mode === 'light') {
      root.classList.remove('dark')
      root.classList.add('light')
    } else {
      // system mode
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.remove('light')
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
        root.classList.add('light')
      }
    }
  }, [mode])

  // Determine antd algorithm and tokens
  const prefersDark = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark)

  const themeConfig = {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: isDark ? {
      colorPrimary: '#3b82f6',
      colorBgContainer: '#0f172a',
      colorBgElevated: '#1e293b',
      colorText: '#f8fafc',
      colorTextSecondary: '#e2e8f0',
      colorBorder: '#334155',
      colorBgLayout: '#0f172a',
    } : {
      colorPrimary: '#73D13D',
      colorBgContainer: '#ffffff',
      colorBgElevated: '#ffffff',
      colorText: '#0f172a',
      colorTextSecondary: '#475569',
      colorBorder: '#e2e8f0',
      colorBgLayout: '#ffffff',
    },
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      <ConfigProvider
        theme={themeConfig}
      >
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}
