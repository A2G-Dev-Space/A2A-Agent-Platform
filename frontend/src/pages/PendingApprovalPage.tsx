import { LogOut, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export default function PendingApprovalPage() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = import.meta.env.VITE_API_BASE_URL + '/api/auth/logout/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        {/* Lock Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
            <Lock className="w-10 h-10 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
          승인 대기 중입니다
        </h1>

        {/* User Info */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">로그인 사용자</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {user?.username_kr || user?.username}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
        </div>

        {/* Message */}
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          관리자가 승인할 때까지 기다려주세요.
          <br />
          승인 후 플랫폼의 모든 기능을 사용할 수 있습니다.
        </p>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-colors"
        >
          <LogOut className="w-5 h-5" />
          로그아웃
        </button>
      </div>
    </div>
  );
}
