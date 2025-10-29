import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, LayoutGrid, Workflow, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const { logout } = useAuthStore();

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
      isActive
        ? 'bg-primary/10 text-primary'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
    }`;

  return (
    <aside className="flex flex-col h-screen w-64 bg-white dark:bg-[#110d1a] border-r border-slate-200 dark:border-slate-800 sticky top-0 p-4">
      <div className="flex items-center gap-3 h-16 border-b border-slate-200 dark:border-slate-800 px-2">
        <div className="size-8 text-primary">
          <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#clip0_6_535)">
              <path
                clipRule="evenodd"
                d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z"
                fill="currentColor"
                fillRule="evenodd"
              ></path>
            </g>
            <defs>
              <clipPath id="clip0_6_535">
                <rect fill="white" height="48" width="48"></rect>
              </clipPath>
            </defs>
          </svg>
        </div>
        <h2 className="text-slate-800 dark:text-white text-lg font-bold">A2G Platform</h2>
      </div>
      <div className="flex flex-col justify-between flex-1 mt-4">
        <nav className="flex flex-col gap-2">
          <NavLink to="/workbench" className={navLinkClasses}>
            <Home className="size-5" />
            <p className="text-sm font-medium">{t('sidebar.workbench')}</p>
          </NavLink>
          <NavLink to="/hub" className={navLinkClasses}>
            <LayoutGrid className="size-5" />
            <p className="text-sm font-medium">{t('sidebar.hub')}</p>
          </NavLink>
          <NavLink to="/flow" className={navLinkClasses}>
            <Workflow className="size-5" />
            <p className="text-sm font-medium">{t('sidebar.flow')}</p>
          </NavLink>
          <NavLink to="/settings" className={navLinkClasses}>
            <Settings className="size-5" />
            <p className="text-sm font-medium">{t('sidebar.settings')}</p>
          </NavLink>
        </nav>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <LogOut className="size-5" />
            <p className="text-sm font-medium">{t('sidebar.logout')}</p>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;