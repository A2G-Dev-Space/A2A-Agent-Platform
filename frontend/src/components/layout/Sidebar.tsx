import { useLocation, useNavigate } from 'react-router-dom';
import { Wrench, Building2, Zap, Settings } from 'lucide-react';
import { MODE_COLORS } from '@/utils/constants';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentMode = location.pathname.startsWith('/workbench')
    ? 'workbench'
    : location.pathname.startsWith('/hub')
    ? 'hub'
    : location.pathname.startsWith('/flow')
    ? 'flow'
    : null;

  const isSettings = location.pathname.startsWith('/settings');

  const modes = [
    { id: 'workbench', icon: Wrench, label: 'Workbench', path: '/workbench' },
    { id: 'hub', icon: Building2, label: 'Hub', path: '/hub' },
    { id: 'flow', icon: Zap, label: 'Flow', path: '/flow' },
  ] as const;

  return (
    <div className="w-16 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Mode Navigation */}
      <div className="flex flex-col gap-2 p-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          const colors = MODE_COLORS[mode.id];

          return (
            <button
              key={mode.id}
              onClick={() => navigate(mode.path)}
              className={`
                group relative w-12 h-12 rounded-lg flex items-center justify-center
                transition-all duration-200
                ${isActive ? colors.bg : 'hover:bg-gray-200 dark:hover:bg-gray-800'}
              `}
              title={mode.label}
            >
              <Icon
                className={`
                  w-6 h-6 transition-colors
                  ${isActive ? colors.text : 'text-gray-600 dark:text-gray-400'}
                `}
              />

              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {mode.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings Button */}
      <div className="p-2">
        <button
          onClick={() => navigate('/settings')}
          className={`
            group relative w-12 h-12 rounded-lg flex items-center justify-center
            transition-all duration-200
            ${
              isSettings
                ? 'bg-gray-300 dark:bg-gray-700'
                : 'hover:bg-gray-200 dark:hover:bg-gray-800'
            }
          `}
          title="Settings"
        >
          <Settings
            className={`
              w-6 h-6 transition-colors
              ${isSettings ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}
            `}
          />

          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Settings
          </div>
        </button>
      </div>
    </div>
  );
}
