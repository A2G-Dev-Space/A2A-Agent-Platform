import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/appStore';

const GeneralSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useAppStore();

  const handleThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTheme({ ...theme, mode: e.target.value as 'light' | 'dark' | 'system' });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="mt-8 flex flex-col gap-10">
      <section>
        <h2 className="text-slate-900 text-xl font-bold leading-tight tracking-tight dark:text-white">{t('settings.general.themeTitle')}</h2>
        <p className="mt-1 text-slate-500 text-sm dark:text-slate-400">{t('settings.general.themeSubtitle')}</p>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Light Theme */}
          <div className={`flex flex-1 items-center gap-4 rounded-lg border p-4 ${theme.mode === 'light' ? 'border-primary/50 bg-primary/10' : 'border-slate-200/80'}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10">
              <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">light_mode</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t('settings.general.lightTheme')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.general.lightThemeDesc')}</p>
            </div>
            <input type="radio" name="theme-option" value="light" checked={theme.mode === 'light'} onChange={handleThemeChange} className="h-4 w-4 border-slate-300 bg-slate-100 text-primary focus:ring-2 focus:ring-primary/50 dark:border-slate-600 dark:bg-slate-700" />
          </div>
          {/* Dark Theme */}
          <div className={`flex flex-1 items-center gap-4 rounded-lg border p-4 ${theme.mode === 'dark' ? 'border-primary/50 bg-primary/10' : 'border-slate-200/80'}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10">
              <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">dark_mode</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t('settings.general.darkTheme')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.general.darkThemeDesc')}</p>
            </div>
            <input type="radio" name="theme-option" value="dark" checked={theme.mode === 'dark'} onChange={handleThemeChange} className="h-4 w-4 border-slate-300 bg-slate-100 text-primary focus:ring-2 focus:ring-primary/50 dark:border-slate-600 dark:bg-slate-700" />
          </div>
        </div>
      </section>
      <section>
        <h2 className="text-slate-900 text-xl font-bold leading-tight tracking-tight dark:text-white">{t('settings.general.languageTitle')}</h2>
        <p className="mt-1 text-slate-500 text-sm dark:text-slate-400">{t('settings.general.languageSubtitle')}</p>
        <div className="mt-6 max-w-sm">
          <div className="relative">
            <select
              value={i18n.language}
              onChange={handleLanguageChange}
              className="w-full appearance-none rounded-lg border border-slate-200/80 bg-background-light py-2 pl-3 pr-10 text-sm text-slate-900 focus:border-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-white/10 dark:bg-background-dark dark:text-white"
            >
              <option value="en">English (EN)</option>
              <option value="ko">Korean (KR)</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">unfold_more</span>
          </div>
        </div>
      </section>
      <div className="mt-4 flex justify-end border-t border-slate-200/80 pt-6 dark:border-white/10">
        <button className="flex min-w-28 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary/80">
          {t('settings.general.saveButton')}
        </button>
      </div>
    </div>
  );
};

export default GeneralSettingsPage;