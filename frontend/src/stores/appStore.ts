import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AppMode } from '@/types'

interface AppState {
  // UI State
  mode: AppMode
  sidebarCollapsed: boolean
  isLoading: boolean

  // Actions
  setMode: (mode: AppMode) => void
  toggleSidebar: () => void
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mode: AppMode.HUB,
      sidebarCollapsed: false,
      isLoading: false,

      setMode: (mode: AppMode) => set({ mode }),

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setLoading: (isLoading: boolean) => set({ isLoading }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        mode: state.mode,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)