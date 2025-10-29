import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Send, Mic, Paperclip, Users } from 'lucide-react';

export const FlowDashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <main className="flex flex-1 flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      <div className="flex flex-1 flex-col max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-start mb-4 gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-2xl font-bold leading-tight tracking-[-0.033em] truncate">{t('flow.title')}</p>
            <p className="text-base font-normal leading-normal text-text-light-secondary dark:text-text-dark-secondary">{t('flow.subtitle')}</p>
          </div>
          <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-accent dark:bg-accent-dark text-slate-900 text-sm font-bold leading-normal tracking-[0.015em] gap-2 shrink-0">
            <Plus className="text-lg" />
            <span className="truncate">{t('flow.newChat')}</span>
          </button>
        </div>
        <div className="flex flex-1 flex-col bg-panel-light dark:bg-panel-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-3 p-4 border-b border-border-light dark:border-border-dark">
            <div className="relative w-full">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary" />
              <select className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-accent-dark focus:border-accent-dark" multiple>
                <option selected>{t('flow.allAgents')}</option>
              </select>
            </div>
          </div>
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="flex flex-col items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 rounded-full bg-accent dark:bg-accent-dark/50">
                  <Users className="text-4xl text-accent-dark dark:text-accent" />
                </div>
                <h2 className="text-xl font-bold">{t('flow.welcomeTitle')}</h2>
                <p className="text-text-light-secondary dark:text-text-dark-secondary max-w-md">{t('flow.welcomeSubtitle')}</p>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-border-light dark:border-border-dark">
            <div className="relative">
              <textarea
                className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg pl-4 pr-28 py-3 text-sm focus:ring-accent-dark focus:border-accent-dark resize-none"
                placeholder={t('flow.messagePlaceholder')}
                rows={1}
              ></textarea>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button className="flex items-center justify-center size-9 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-text-light-secondary dark:text-text-dark-secondary">
                  <Mic className="text-xl" />
                </button>
                <button className="flex items-center justify-center size-9 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-text-light-secondary dark:text-text-dark-secondary">
                  <Paperclip className="text-xl" />
                </button>
                <button className="flex items-center justify-center size-9 rounded-lg bg-accent dark:bg-accent-dark text-slate-900 transition-colors">
                  <Send className="text-xl" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};