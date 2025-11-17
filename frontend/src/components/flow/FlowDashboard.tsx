import React from 'react';
import { useTranslation } from 'react-i18next';
import { Construction } from 'lucide-react';

export const FlowDashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <main className="flex flex-1 flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      <div className="flex flex-1 flex-col items-center justify-center max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="p-6 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
            <Construction className="h-16 w-16 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h1 className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {t('flow.title')}
          </h1>
          <p className="text-xl text-text-light-secondary dark:text-text-dark-secondary max-w-md">
            {t('flow.underDevelopment')}
          </p>
        </div>
      </div>
    </main>
  );
};