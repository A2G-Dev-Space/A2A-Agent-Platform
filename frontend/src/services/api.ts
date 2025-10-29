import axios, { type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add trace ID for debugging
    const traceId = generateTraceId()
    config.headers['X-Trace-ID'] = traceId

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  async (error) => {
    const originalRequest = error.config

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Try to refresh token
        const authStore = await import('@/stores/authStore').then(m => m.useAuthStore.getState())
        await authStore.refreshToken()

        // Retry original request
        const token = localStorage.getItem('accessToken')
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, redirect to login
        const authStore = await import('@/stores/authStore').then(m => m.useAuthStore.getState())
        authStore.clearAuth()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Handle other errors
    if (error.response) {
      let errorMessage = 'An error occurred'

      // Handle FastAPI validation errors (422 Unprocessable Entity)
      if (error.response.status === 422 && Array.isArray(error.response.data?.detail)) {
        // Parse FastAPI validation errors
        const validationErrors = error.response.data.detail
        errorMessage = validationErrors
          .map((err: any) => {
            const field = err.loc?.slice(1).join('.') || 'field'
            return `${field}: ${err.msg}`
          })
          .join(', ')
      } else {
        // Handle other error formats
        errorMessage = error.response.data?.error?.message ||
                      (typeof error.response.data?.detail === 'string' ? error.response.data.detail : null) ||
                      'An error occurred'
      }

      // Show error toast for user-facing errors
      if (error.response.status >= 400 && error.response.status < 500) {
        toast.error(errorMessage)
      }

      // Log server errors
      if (error.response.status >= 500) {
        console.error('Server error:', error.response.data)
        toast.error('Server error occurred. Please try again later.')
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error)
      toast.error('Network error. Please check your connection.')
    }

    return Promise.reject(error)
  }
)

// Helper function to generate trace ID
function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Generic API methods
export const apiClient = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return api.get(url, config)
  },

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.post(url, data, config)
  },

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.put(url, data, config)
  },

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.patch(url, data, config)
  },

  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return api.delete(url, config)
  },
}

export default api