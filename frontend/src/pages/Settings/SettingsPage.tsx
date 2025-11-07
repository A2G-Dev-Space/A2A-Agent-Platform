import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  // Define all tabs with their required roles
  const allTabs = [
    { name: t('settings.tabs.general'), path: '/settings/general', requiredRole: null },
    { name: t('settings.tabs.platformKeys'), path: '/settings/platform-keys', requiredRole: null },
    { name: t('settings.tabs.userManagement'), path: '/settings/user-management', requiredRole: 'ADMIN' },
    { name: t('settings.tabs.llmManagement'), path: '/settings/llm-management', requiredRole: 'ADMIN' },
    { name: t('settings.tabs.statistics'), path: '/settings/statistics', requiredRole: 'ADMIN' },
  ];

  // Filter tabs based on user role
  const tabs = allTabs.filter(tab => {
    if (!tab.requiredRole) return true;
    return user?.role === tab.requiredRole;
  });

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 ${
      isActive
        ? 'border-b-primary text-gray-900 dark:text-white'
        : 'border-b-transparent text-gray-500 dark:text-[#ab9abc] hover:text-gray-700 dark:hover:text-gray-200'
    }`;

  return (
    <div className="max-w-7xl mx-auto">
        <div className="flex min-w-72 flex-col gap-3 mb-6">
            <h1 className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">{t('settings.title')}</h1>
            <p className="text-gray-500 dark:text-[#ab9abc] text-base font-normal leading-normal">{t('settings.subtitle')}</p>
        </div>
        <div className="pb-3 mb-6">
            <div className="flex border-b border-gray-200 dark:border-[#483956] gap-8">
                {tabs.map(tab => (
                    <NavLink key={tab.path} to={tab.path} className={navLinkClasses}>
                        <p className="text-sm font-bold leading-normal tracking-[0.015em]">{tab.name}</p>
                    </NavLink>
                ))}
            </div>
        </div>
        <div>
            <Outlet />
        </div>
    </div>
  );
};

export default SettingsPage;