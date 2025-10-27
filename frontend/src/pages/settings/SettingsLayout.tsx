import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Settings, Key, Users, BarChart3, TrendingUp, Cpu } from 'lucide-react';

export default function SettingsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuthStore();

  const tabs = [
    { path: '/settings/general', label: '일반', icon: Settings },
    { path: '/settings/api-keys', label: 'API Keys', icon: Key },
  ];

  const adminTabs = [
    { path: '/settings/admin/users', label: '사용자 관리', icon: Users },
    { path: '/settings/admin/llm-usage', label: 'LLM 사용량 통계', icon: BarChart3 },
    { path: '/settings/admin/agent-usage', label: 'Agent 사용량 통계', icon: TrendingUp },
    { path: '/settings/admin/llm-models', label: 'LLM 모델 관리', icon: Cpu },
  ];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">설정</h2>

        {/* User Tabs */}
        <div className="space-y-1 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Admin Tabs */}
        {role === 'ADMIN' && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-800 my-4" />
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 px-4">
              관리자 메뉴
            </h3>
            <div className="space-y-1">
              {adminTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = location.pathname === tab.path;
                return (
                  <button
                    key={tab.path}
                    onClick={() => navigate(tab.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        <Outlet />
      </div>
    </div>
  );
}
