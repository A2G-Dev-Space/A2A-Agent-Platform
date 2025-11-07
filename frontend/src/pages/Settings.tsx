import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { Settings2, Key, Database, Users, BarChart3, X } from 'lucide-react';
import GeneralSettings from '@/components/settings/GeneralSettings';
import PlatformKeys from '@/components/settings/PlatformKeys';
import AdminLLMManagement from '@/components/settings/AdminLLMManagement';
import UserManagement from '@/components/settings/UserManagement';
import Statistics from '@/components/settings/Statistics';

type SettingsTab = 'general' | 'keys' | 'llm' | 'users' | 'statistics';

export default function Settings() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isOpen, setIsOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const tabs = [
    { id: 'general', label: 'General', icon: Settings2, adminOnly: false },
    { id: 'keys', label: 'Platform Keys', icon: Key, adminOnly: false },
    { id: 'llm', label: 'LLM Management', icon: Database, adminOnly: true },
    { id: 'users', label: 'User Management', icon: Users, adminOnly: true },
    { id: 'statistics', label: 'Statistics', icon: BarChart3, adminOnly: true },
  ].filter(tab => !tab.adminOnly || isAdmin);

  useEffect(() => {
    // Listen for settings open event from header
    const handleOpenSettings = () => setIsOpen(true);
    window.addEventListener('openSettings', handleOpenSettings);
    return () => window.removeEventListener('openSettings', handleOpenSettings);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-5xl mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[calc(85vh-73px)]">
          {/* Sidebar */}
          <div className="w-56 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <nav className="p-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                    className={`w-full flex items-center gap-3 px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary dark:bg-primary/20'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {activeTab === 'general' && <GeneralSettings />}
              {activeTab === 'keys' && <PlatformKeys />}
              {activeTab === 'llm' && isAdmin && <AdminLLMManagement />}
              {activeTab === 'users' && isAdmin && <UserManagement />}
              {activeTab === 'statistics' && isAdmin && <Statistics />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}