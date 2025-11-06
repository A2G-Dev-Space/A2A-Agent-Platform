import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  mode: 'workbench' | 'hub' | 'flow' | 'settings';
}

const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems: NavItem[] = [
    { to: '/workbench', icon: 'code_blocks', label: t('sidebar.workbench'), mode: 'workbench' },
    { to: '/hub', icon: 'apps', label: t('sidebar.hub'), mode: 'hub' },
    { to: '/flow', icon: 'hub', label: t('sidebar.flow'), mode: 'flow' },
  ];

  // Mode-specific colors for active states
  const getModeColors = (mode: string, isActive: boolean) => {
    if (!isActive) {
      return 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
    }

    switch (mode) {
      case 'workbench':
        return 'bg-red-50 dark:bg-workbench-primary/20 text-workbench-primary';
      case 'hub':
        return 'bg-hub-accent-light dark:bg-hub-accent/20 text-hub-accent-dark dark:text-hub-accent-light';
      case 'flow':
        return 'bg-yellow-50 dark:bg-flow-primary/20 text-flow-primary';
      case 'settings':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  return (
    <aside className="flex flex-col h-screen w-64 bg-panel-light dark:bg-[#110d1a] border-r border-border-light dark:border-border-dark sticky top-0">
      {/* Logo & Platform Name */}
      <div className="flex items-center gap-3 h-16 border-b border-border-light dark:border-border-dark px-6">
        <div className="size-6 text-primary">
          <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#clip0_6_535)">
              <path
                clipRule="evenodd"
                d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z"
                fill="currentColor"
                fillRule="evenodd"
              />
            </g>
            <defs>
              <clipPath id="clip0_6_535">
                <rect fill="white" height="48" width="48" />
              </clipPath>
            </defs>
          </svg>
        </div>
        <h2 className="text-text-light-primary dark:text-text-dark-primary text-lg font-bold">
          A2A Platform
        </h2>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 p-4">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${getModeColors(
                item.mode,
                isActive
              )}`}
            >
              <span
                className="material-symbols-outlined text-lg"
                style={{
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              <p className="text-sm font-medium">{item.label}</p>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;