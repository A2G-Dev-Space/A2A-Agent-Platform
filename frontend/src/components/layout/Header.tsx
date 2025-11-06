import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-end h-16 bg-panel-light dark:bg-[#110d1a]/50 backdrop-blur-sm border-b border-border-light dark:border-border-dark px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button
          className="p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors relative"
          title="Notifications"
        >
          <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
            notifications
          </span>
          {/* Notification badge */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User Menu */}
        {user && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full">
                <Avatar
                  src={user.avatar}
                  alt={user.name || user.username_kr}
                  fallback={user.username_kr?.charAt(0)?.toUpperCase()}
                  size="md"
                  status="online"
                />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[220px] bg-panel-light dark:bg-panel-dark rounded-lg border border-border-light dark:border-border-dark shadow-lg p-1 z-50"
                sideOffset={5}
                align="end"
              >
                <div className="px-3 py-2 border-b border-border-light dark:border-border-dark">
                  <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                    {user.name || user.username_kr}
                  </p>
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    {user.email}
                  </p>
                </div>

                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-background-dark rounded-md cursor-pointer outline-none"
                  onSelect={() => navigate('/settings')}
                >
                  <span className="material-symbols-outlined text-lg">settings</span>
                  Settings
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="h-px bg-border-light dark:bg-border-dark my-1" />

                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md cursor-pointer outline-none"
                  onSelect={() => logout()}
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Logout
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>
    </header>
  );
};

export default Header;