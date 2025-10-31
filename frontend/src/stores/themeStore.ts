import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  initTheme: () => void;
}

const applyTheme = (theme: ThemeMode) => {
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme: ThemeMode) => {
        set({ theme });
        applyTheme(theme);
      },
      initTheme: () => {
        const initialTheme = get().theme;
        applyTheme(initialTheme);

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (get().theme === 'system') {
            if (e.matches) {
              document.documentElement.setAttribute('data-theme', 'dark');
            } else {
              document.documentElement.setAttribute('data-theme', 'light');
            }
          }
        });
      },
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
);
