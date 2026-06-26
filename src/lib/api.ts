import axios, { AxiosError } from 'axios'

const PRIMARY_API_URL = import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL
const BACKUP_API_URL = import.meta.env.VITE_API_URL_BACKUP || import.meta.env.NEXT_PUBLIC_API_URL_BACKUP

// Create axios instance for business logic API calls
const api = axios.create({
  baseURL: PRIMARY_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor: inject Supabase JWT token from localStorage
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

// Response interceptor: handle auth errors and API fallback
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle 401 - likely token expired or invalid
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      // Token is managed by Supabase client; if 401, session is invalid
      // Clear localStorage and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        localStorage.removeItem('tenant')
        // Redirect to login for user to re-authenticate
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
      return Promise.reject(error)
    }

    // Handle API fallback: if primary API fails, try backup
    if (
      !originalRequest._retry &&
      (error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNRESET' ||
        (error.response?.status && error.response.status >= 500) ||
        !error.response)
    ) {
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

    return Promise.reject(error)
  }
)

export default api
