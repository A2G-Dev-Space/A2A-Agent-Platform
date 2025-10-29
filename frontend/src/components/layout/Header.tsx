import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, User, Key, Settings, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import clsx from 'clsx'

export const Header: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { mode } = useAppStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogoClick = () => {
    // Navigate to current mode's main page
    navigate(`/${mode}`)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const getUserRoleBadgeColor = () => {
    switch (user?.role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'USER':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  return (
    <header className="flex justify-between items-center px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Left side - Logo and Title */}
      <div
        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleLogoClick}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
          A2G
        </div>
        <h1 className="text-xl font-bold">A2G Platform</h1>
      </div>

      {/* Right side - User Profile */}
      {user ? (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <User size={18} className="text-purple-700 dark:text-purple-300" />
            </div>
            <span className="font-medium">{user.username}</span>
            <ChevronDown
              size={16}
              className={clsx(
                'transition-transform duration-200',
                dropdownOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 animate-fadeIn">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="font-semibold text-lg">{user.username_kr}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user.username}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user.department_kr}</p>
                <div className="mt-2">
                  <span className={clsx(
                    'inline-block px-2 py-1 text-xs font-medium rounded',
                    getUserRoleBadgeColor()
                  )}>
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    navigate('/settings/api-keys')
                  }}
                  className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Key size={18} />
                  <span>API Keys</span>
                </button>
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    navigate('/settings/general')
                  }}
                  className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Settings size={18} />
                  <span>Settings</span>
                </button>
              </div>

              {/* Logout */}
              <div className="border-t border-gray-200 dark:border-gray-700 py-2">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Login
        </button>
      )}
    </header>
  )
}