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

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle token refresh and fallback
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
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

    return Promise.reject(error)
  }
)

export default api
