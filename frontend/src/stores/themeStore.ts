import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  fontScale: number;
  setTheme: (theme: ThemeMode) => void;
  setFontScale: (scale: number) => void;
  initTheme: () => void;
}

const applyTheme = (theme: ThemeMode) => {
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
};

const applyFontScale = (scale: number) => {
  document.documentElement.style.fontSize = `${scale}%`;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      fontScale: 80,
      setTheme: (theme: ThemeMode) => {
        set({ theme });
        applyTheme(theme);
      },
      setFontScale: (scale: number) => {
        set({ fontScale: scale });
        applyFontScale(scale);
      },
      initTheme: () => {
        const initialTheme = get().theme;
        const initialFontScale = get().fontScale;
        applyTheme(initialTheme);
        applyFontScale(initialFontScale);

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
        fontScale: state.fontScale,
      }),
    }
  )
);
