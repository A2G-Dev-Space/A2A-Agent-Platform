import { create } from 'zustand';
import { userService } from '@/services/userService';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  fontScale: number;
  language: string;
  isLoading: boolean;
  setTheme: (theme: ThemeMode) => void;
  setFontScale: (scale: number) => void;
  setLanguage: (lang: string) => void;
  loadPreferences: () => Promise<void>;
  savePreferences: () => Promise<void>;
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

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  fontScale: 80,
  language: 'en',
  isLoading: false,

  setTheme: async (theme: ThemeMode) => {
    set({ theme });
    applyTheme(theme);
    await get().savePreferences();
  },

  setFontScale: async (scale: number) => {
    set({ fontScale: scale });
    applyFontScale(scale);
    await get().savePreferences();
  },

  setLanguage: async (lang: string) => {
    set({ language: lang });
    await get().savePreferences();
  },

  loadPreferences: async () => {
    set({ isLoading: true });
    try {
      const preferences = await userService.getUserPreferences();
      if (preferences) {
        set({
          theme: preferences.theme || 'light',
          fontScale: preferences.fontScale || 80,
          language: preferences.language || 'en',
        });
        applyTheme(preferences.theme || 'light');
        applyFontScale(preferences.fontScale || 80);
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      // Fallback to defaults if loading fails
    } finally {
      set({ isLoading: false });
    }
  },

  savePreferences: async () => {
    const { theme, fontScale, language } = get();
    try {
      await userService.updateUserPreferences({
        theme,
        fontScale,
        language,
      });
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  },

  initTheme: async () => {
    // First, load preferences from DB
    await get().loadPreferences();

    // Then apply them
    const { theme, fontScale } = get();
    applyTheme(theme);
    applyFontScale(fontScale);

    // Listen for system theme changes
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
}));