import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, Key, Settings, User } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { IconButton, Menu, MenuItem, Avatar, Divider } from '@mui/material';

export default function Header() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    window.location.href = import.meta.env.VITE_API_BASE_URL + '/api/auth/logout/';
  };

  const handleLogin = () => {
    window.location.href = import.meta.env.VITE_API_BASE_URL + '/api/auth/login/';
  };

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-6">
      {/* Logo & Platform Name */}
      <div
        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => navigate('/')}
      >
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
          A2G
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">A2G Platform</h1>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <IconButton onClick={toggleTheme} size="small">
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-gray-400" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </IconButton>

        {/* User Menu */}
        {isAuthenticated && user ? (
          <>
            <button
              onClick={handleMenuOpen}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Avatar
                sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
                alt={user.username_kr || user.username}
              >
                {(user.username_kr || user.username).charAt(0)}
              </Avatar>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user.username_kr || user.username}
              </span>
            </button>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              {/* User Info Header */}
              <div className="px-4 py-3 min-w-[250px]">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {user.username_kr || user.username}
                  {user.role === 'ADMIN' && (
                    <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{user.email}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{user.deptname_kr}</div>
              </div>

              <Divider />

              <MenuItem
                onClick={() => {
                  navigate('/settings/api-keys');
                  handleMenuClose();
                }}
              >
                <Key className="w-4 h-4 mr-2" />
                API Keys
              </MenuItem>

              <MenuItem
                onClick={() => {
                  navigate('/settings/general');
                  handleMenuClose();
                }}
              >
                <Settings className="w-4 h-4 mr-2" />
                설정
              </MenuItem>

              <Divider />

              <MenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </MenuItem>
            </Menu>
          </>
        ) : (
          <button
            onClick={handleLogin}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            로그인
          </button>
        )}
      </div>
    </header>
  );
}
