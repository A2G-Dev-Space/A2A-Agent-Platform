import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StatisticsPage: React.FC = () => {
  const { t } = useTranslation();

  // Dummy data for now
  const topConsumers = [
    { name: 'User A', tokens: 4500 },
    { name: 'User B', tokens: 3000 },
    { name: 'User C', tokens: 2000 },
    { name: 'User D', tokens: 1500 },
    { name: 'User E', tokens: 1000 },
  ];

  const agentUsage = [
    { name: 'SupportBot', count: 1200 },
    { name: 'SalesPro', count: 900 },
    { name: 'OnboardingHelper', count: 600 },
    { name: 'TechAdvisor', count: 300 },
  ];

  return (
    <div className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('settings.statistics.title')}</h3>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-base font-medium leading-normal text-slate-600 dark:text-slate-400">{t('settings.statistics.totalUsers')}</p>
            <p className="text-3xl font-bold leading-tight tracking-tight text-slate-800 dark:text-white">1,428</p>
        </div>
        <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-base font-medium leading-normal text-slate-600 dark:text-slate-400">{t('settings.statistics.activeAgents')}</p>
            <p className="text-3xl font-bold leading-tight tracking-tight text-slate-800 dark:text-white">76</p>
        </div>
        <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-base font-medium leading-normal text-slate-600 dark:text-slate-400">{t('settings.statistics.agentsInDev')}</p>
            <p className="text-3xl font-bold leading-tight tracking-tight text-slate-800 dark:text-white">12</p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('settings.statistics.topConsumers')}</h3>
            <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topConsumers}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="tokens" fill="#8884d8" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('settings.statistics.agentUsage')}</h3>
            <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agentUsage} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#82ca9d" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;