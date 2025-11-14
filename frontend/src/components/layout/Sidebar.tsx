import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  mode: 'workbench' | 'hub' | 'flow' | 'settings';
}

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onMobileClose }) => {
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
      return {
        className: 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
        style: {}
      };
    }

    switch (mode) {
      case 'workbench':
        return {
          className: 'transition-colors',
          style: {
            backgroundColor: 'var(--color-workbench-bg-light)',
            color: 'var(--color-workbench-primary)',
            ...(document.documentElement.getAttribute('data-theme') === 'dark' && {
              backgroundColor: 'rgba(234, 40, 49, 0.1)', // workbench-primary with opacity
              color: '#EA2831'
            })
          }
        };
      case 'hub':
        return {
          className: 'transition-colors',
          style: {
            backgroundColor: '#E0F2FE',
            color: 'var(--color-hub-primary)',
            ...(document.documentElement.getAttribute('data-theme') === 'dark' && {
              backgroundColor: 'rgba(53, 158, 255, 0.1)', // hub-primary with opacity
              color: '#359EFF'
            })
          }
        };
      case 'flow':
        return {
          className: 'transition-colors',
          style: {
            backgroundColor: '#FEF3C7',
            color: 'var(--color-flow-primary)',
            ...(document.documentElement.getAttribute('data-theme') === 'dark' && {
              backgroundColor: 'rgba(250, 198, 56, 0.1)', // flow-primary with opacity
              color: '#FAC638'
            })
          }
        };
      case 'settings':
        return {
          className: 'bg-primary/10 text-primary',
          style: {}
        };
      default:
        return {
          className: 'bg-primary/10 text-primary',
          style: {}
        };
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 z-50 lg:z-auto
          flex flex-col h-screen w-64
          bg-panel-light dark:bg-[#110d1a]
          border-r border-border-light dark:border-border-dark
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo & Platform Name */}
        <div className="flex items-center justify-between h-16 border-b border-border-light dark:border-border-dark px-6">
          <div className="flex items-center gap-3">
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
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 p-4">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            const colorConfig = getModeColors(item.mode, isActive);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onMobileClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg ${colorConfig.className}`}
                style={colorConfig.style}
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
    </>
  );
};

export default Sidebar;