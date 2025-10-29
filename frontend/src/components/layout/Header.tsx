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
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 cursor-pointer"
            style={{ backgroundImage: `url(${user.avatar_url})` }}
            onClick={() => navigate('/settings')}
            title="Go to settings"
          />
        ) : (
          <div className="bg-gray-300 rounded-full size-10" />
        )}
      </div>
    </header>
  );
};

export default Header;