import { apiClient } from './api'
import { type LoginResponse, type User } from '@/types'

const AUTH_BASE = '/auth'

export const authService = {
  // Initiate SSO login
  initiateLogin: async () => {
    const redirectUri = `${window.location.origin}/callback`
    console.log('Initiating login with redirect_uri:', redirectUri)
    const result = await apiClient.post(`${AUTH_BASE}/login/`, { redirect_uri: redirectUri })
    console.log('Login initiation result:', result)
    return result
  },

  // Handle SSO callback
  handleCallback: async (idToken: string): Promise<LoginResponse> => {
    return apiClient.post(`${AUTH_BASE}/callback/`, { id_token: idToken })
  },

  // Logout
  logout: async () => {
    return apiClient.post(`${AUTH_BASE}/logout/`)
  },

  // Refresh token
  refreshToken: async () => {
    return apiClient.post(`${AUTH_BASE}/refresh/`)
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    return apiClient.get('/users/me/')
  },

  // Update user profile
  updateProfile: async (data: Partial<User>): Promise<User> => {
    return apiClient.patch('/users/me/', data)
  },

  // API Key management
  getApiKeys: async () => {
    return apiClient.get('/users/me/api-keys/')
  },

  createApiKey: async (name: string) => {
    return apiClient.post('/users/me/api-keys/', { name })
  },

  deleteApiKey: async (id: number) => {
    return apiClient.delete(`/users/me/api-keys/${id}/`)
  },
}