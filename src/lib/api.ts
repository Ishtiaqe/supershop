import axios, { AxiosError } from 'axios'

const PRIMARY_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'
const BACKUP_API_URL = process.env.NEXT_PUBLIC_API_URL_BACKUP || PRIMARY_API_URL

// Create axios instance with retry logic
const api = axios.create({
  baseURL: PRIMARY_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // With cookies enabled we rely on HttpOnly cookies for authentication
  withCredentials: true,
})

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
      try {
        // Make a refresh call using cookies (HttpOnly refresh token) — server will set cookie headers
        const refreshConfig = {
          method: 'POST',
          url: '/auth/refresh',
          baseURL: PRIMARY_API_URL,
        }
        // Attempt refresh with primary/backup; we don't need the body here (cookies are set by server)
        try {
          await axios({ ...refreshConfig, withCredentials: true })
        } catch (primaryError) {
          const error = primaryError as AxiosError
          if (error.code === 'ECONNREFUSED' ||
            error.code === 'ENOTFOUND' ||
            error.code === 'ECONNRESET' ||
            (error.response?.status && error.response.status >= 500) ||
            !error.response) {
            console.warn('Primary API refresh failed, trying backup...')
            refreshConfig.baseURL = BACKUP_API_URL
            await axios({ ...refreshConfig, withCredentials: true })
          } else {
            throw primaryError
          }
        }
        // The server should set cookies; retry original request
        return api(originalRequest)
      } catch {
        // If refresh fails, navigate to login
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
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
