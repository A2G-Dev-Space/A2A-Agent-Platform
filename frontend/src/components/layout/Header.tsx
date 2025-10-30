import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-end h-16 bg-white dark:bg-[#110d1a]/50 backdrop-blur-sm border-b border-solid border-slate-200 dark:border-slate-800 px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {user ? (
          <div
            className="flex items-center justify-center size-10 bg-primary/20 dark:bg-primary/30 rounded-full cursor-pointer"
            onClick={() => navigate('/settings')}
            title="Go to settings"
          >
            <span className="text-lg font-semibold text-primary">{user.username_kr.charAt(0)}</span>
          </div>
        ) : (
          <div className="bg-gray-300 rounded-full size-10" />
        )}
      </div>
    </header>
  );
};

export default Header;