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
  loginCallback: (idToken: string) => Promise<void>
  logout: () => Promise<void>
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
          set({ isLoading: true, error: null });
          const redirectUri = `${window.location.origin}/callback`;
          const response = await authService.initiateLogin(redirectUri);
          // Response is already unwrapped by api interceptor
          const ssoUrl = response.sso_login_url;
          if (ssoUrl) {
            window.location.href = ssoUrl;
          } else {
            throw new Error("SSO login URL not received.");
          }
        } catch (error: any) {
          console.error('Login error:', error);
          set({ error: error.message || 'Login failed', isLoading: false });
        }
      },

      loginCallback: async (idToken: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authService.handleCallback(idToken);
          // Response is already unwrapped by api interceptor
          const loginData: LoginResponse = response;

          set({
            user: loginData.user,
            accessToken: loginData.access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Store token in localStorage for axios interceptor
          localStorage.setItem('accessToken', loginData.access_token);

        } catch (error: any) {
          set({
            error: error.message || 'Authentication failed',
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });
          await authService.logout();
          get().clearAuth();
        } catch (error) {
          console.error('Logout error:', error);
          // Clear auth state even if logout API fails
          get().clearAuth();
        }
      },

      setUser: (user: User) => {
        set({ user });
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        localStorage.removeItem('accessToken');
      },
    }),
    {
      name: 'auth-storage',
      // Only persist these fields to avoid storing sensitive or non-serializable data
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)