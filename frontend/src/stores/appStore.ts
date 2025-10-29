import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AppMode, type AppTheme } from '@/types'

interface AppState {
  // UI State
  mode: AppMode
  theme: AppTheme
  sidebarCollapsed: boolean
  isLoading: boolean

  // Actions
  setMode: (mode: AppMode) => void
  setTheme: (theme: AppTheme) => void
  toggleSidebar: () => void
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mode: AppMode.HUB,
      theme: {
        mode: 'system',
        primaryColor: 'purple',
      },
      sidebarCollapsed: false,
      isLoading: false,

      setMode: (mode: AppMode) => set({ mode }),

      setTheme: (theme: AppTheme) => set({ theme }),

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setLoading: (isLoading: boolean) => set({ isLoading }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        mode: state.mode,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)