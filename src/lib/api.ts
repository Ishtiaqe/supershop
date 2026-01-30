import axios, { AxiosError } from 'axios'

const PRIMARY_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'
const BACKUP_API_URL = process.env.NEXT_PUBLIC_API_URL_BACKUP || PRIMARY_API_URL

// Create axios instance with retry logic
const api = axios.create({
  baseURL: PRIMARY_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending cookies with requests
})

// Request interceptor to add auth token from localStorage
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Simple refresh queue to avoid multiple concurrent refreshes
let isRefreshing = false as boolean
let refreshSubscribers: Array<(success: boolean) => void> = []

function subscribeTokenRefresh(cb: (success: boolean) => void) {
  refreshSubscribers.push(cb)
}

function onRefreshed(success: boolean) {
  const subs = [...refreshSubscribers]
  refreshSubscribers = []
  subs.forEach((cb) => {
    try {
      cb(success)
    } catch {}
  })
}

// Helper: perform refresh against primary, then backup
async function performRefresh() {
  // Refresh token is now in httpOnly cookie, no need to read from localStorage
  const refreshConfig = {
    method: 'POST' as const,
    url: '/auth/refresh',
    baseURL: PRIMARY_API_URL,
    withCredentials: true, // Send cookies with refresh request
  }
  
  try {
    const response = await axios(refreshConfig)
    // Store only access token (refresh token is in httpOnly cookie)
    if (response.data?.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken)
    }
    return response.data
  } catch (primaryError) {
    const error = primaryError as AxiosError
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNRESET' ||
      (error.response?.status && error.response.status >= 500) ||
      !error.response
    ) {
      console.warn('Primary API refresh failed, trying backup...')
      refreshConfig.baseURL = BACKUP_API_URL
      const response = await axios(refreshConfig)
      // Store only access token (refresh token is in httpOnly cookie)
      if (response.data?.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken)
      }
      return response.data
    } else {
      throw primaryError
    }
  }
}

// Response interceptor to handle token refresh and fallback
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[api] Response error:', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
      })
    }
    const originalRequest = error.config

    if (error.response?.status === 401) {
      // Ensure we only refresh once at a time
      if (originalRequest && !originalRequest._retry) {
        originalRequest._retry = true
      }

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[api] 401 received for', originalRequest?.url)
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((success) => {
            if (success) {
              resolve(api(originalRequest))
            } else {
              reject(error)
            }
          })
        })
      }

      isRefreshing = true
      try {
        await performRefresh()
        isRefreshing = false
        onRefreshed(true)
        // Retry original request after refresh with new token
        const token = localStorage.getItem('accessToken')
        if (token && originalRequest) {
          originalRequest.headers.Authorization = `Bearer ${token}`
        }
        return api(originalRequest)
      } catch (e) {
        isRefreshing = false
        onRefreshed(false)
        // If refresh fails, clear tokens and navigate to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('user')
          localStorage.removeItem('tenant')
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }
        return Promise.reject(e)
      }
    }

    // Handle fallback for other requests
    if (!originalRequest._retry &&
      (error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNRESET' ||
        (error.response?.status && error.response.status >= 500) ||
        !error.response)) {

      console.warn('Primary API failed, trying backup URL...')
      originalRequest._retry = true
      originalRequest.baseURL = BACKUP_API_URL

      try {
        return await axios(originalRequest)
      } catch (backupError) {
        console.error('Both primary and backup APIs failed')
        throw backupError
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[api] Final response error (no auth/refresh):', {
        url: originalRequest?.url,
        status: error.response?.status,
        data: error.response?.data,
      })
    }
    return Promise.reject(error)
  }
)

export default api

// Proactive refresh helper: call periodically to avoid expiry-triggered 401s
export function startProactiveRefresh(intervalMs = 12 * 60 * 1000) {
  if (typeof window === 'undefined') return () => {}
  const id = window.setInterval(() => {
    performRefresh().catch(() => {
      // Ignore failures; interceptor will handle if real 401 occurs
    })
  }, intervalMs)
  return () => window.clearInterval(id)
}
