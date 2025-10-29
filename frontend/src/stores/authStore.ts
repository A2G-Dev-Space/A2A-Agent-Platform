import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type User, type LoginResponse } from '@/types'
import { authService } from '@/services/authService'

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: () => Promise<void>
  loginCallback: (idToken: string) => Promise<LoginResponse>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  setUser: (user: User) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async () => {
        try {
          set({ isLoading: true, error: null })
          console.log('Starting login process...')
          const response = await authService.initiateLogin()
          console.log('Login response:', response)
          // Redirect to SSO login URL
          console.log('Redirecting to:', response.sso_login_url)
          window.location.href = response.sso_login_url
        } catch (error: any) {
          console.error('Login error:', error)
          set({ error: error.message || 'Login failed', isLoading: false })
        }
      },

      loginCallback: async (idToken: string) => {
        try {
          set({ isLoading: true, error: null })
          const response: LoginResponse = await authService.handleCallback(idToken)

          set({
            user: response.user,
            accessToken: response.access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })

          // Store token in localStorage for axios interceptor
          localStorage.setItem('accessToken', response.access_token)

          return response
        } catch (error: any) {
          set({
            error: error.message || 'Authentication failed',
            isLoading: false,
            isAuthenticated: false,
          })
          throw error
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true })
          await authService.logout()
          get().clearAuth()
        } catch (error) {
          console.error('Logout error:', error)
          get().clearAuth()
        }
      },

      refreshToken: async () => {
        try {
          const response = await authService.refreshToken()
          set({ accessToken: response.access_token })
          localStorage.setItem('accessToken', response.access_token)
        } catch (error) {
          get().clearAuth()
          throw error
        }
      },

      setUser: (user: User) => {
        set({ user })
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        })
        localStorage.removeItem('accessToken')
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)