import axios, { AxiosError } from 'axios'

const PRIMARY_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'
const BACKUP_API_URL = process.env.NEXT_PUBLIC_API_URL_BACKUP || PRIMARY_API_URL

// Create axios instance with retry logic
const api = axios.create({
  baseURL: PRIMARY_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Helper to read access token in a safe way (guarded for SSR)
function getAccessToken(): string | null {
  try {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('accessToken')
  } catch (e) {
    // localStorage access may fail in some environments; fall back to null
    console.warn('Unable to access localStorage for accessToken:', e)
    return null
  }
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      // Use bracket notation to protect against custom header implementations
      ;(config.headers as Record<string, unknown>)['Authorization'] = `Bearer ${token}`
      // Debugging info — remove in production
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[api] Attaching Authorization header for request:', config.url)
      }
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[api] No access token found; request will be unauthenticated:', config.url)
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

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

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[api] Attempting token refresh for 401 on', originalRequest.url)
      }
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          // Try token refresh with primary URL first, then backup
          const refreshConfig = {
            method: 'POST',
            url: '/auth/refresh',
            data: { refreshToken },
            baseURL: PRIMARY_API_URL
          }

          let refreshResponse
          try {
            refreshResponse = await axios(refreshConfig)
          } catch (primaryError) {
            const error = primaryError as AxiosError
            if (error.code === 'ECONNREFUSED' ||
                error.code === 'ENOTFOUND' ||
                error.code === 'ECONNRESET' ||
                (error.response?.status && error.response.status >= 500) ||
                !error.response) {
              console.warn('Primary API refresh failed, trying backup...')
              refreshConfig.baseURL = BACKUP_API_URL
              refreshResponse = await axios(refreshConfig)
            } else {
              throw primaryError
            }
          }

          const { data } = refreshResponse
          localStorage.setItem('accessToken', data.accessToken)
          localStorage.setItem('refreshToken', data.refreshToken)

          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
          return api(originalRequest)
        } catch {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
        }
      } else {
        window.location.href = '/login'
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
