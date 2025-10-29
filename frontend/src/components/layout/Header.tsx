import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import clsx from 'clsx'

const UserProfile = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 cursor-pointer"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuCvuC6GNpCRPvSo1DSN-528Iwv1qqsbr2zKZqYOLLOc8ZK-0kPVeD2HnQMaJyw9ipITmHUmbSVLUvqO9s-4wW6zafbwoTjXbm0d2IT8SxfXZwemDI4Z-9hY0YgLxRabbVuslmZcANnu3AETt73PIra_coefQ21zBMwoyCe74JvdhGzuzjyX6_5b1YNf2YP5uQnHqqr5TNNkbinXjvIgEgDywDbMwohyE9czLt5jRZWNS3BiqWnV4AJ3blXJPO1UpT9inwUxq7FMBfaj")` }}
        title="User menu"
      />

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-panel-light dark:bg-panel-dark rounded-xl shadow-lg border border-border-light dark:border-border-dark z-50 animate-fadeIn">
          <div className="p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-3">
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12"
                style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuCvuC6GNpCRPvSo1DSN-528Iwv1qqsbr2zKZqYOLLOc8ZK-0kPVeD2HnQMaJyw9ipITmHUmbSVLUvqO9s-4wW6zafbwoTjXbm0d2IT8SxfXZwemDI4Z-9hY0YgLxRabbVuslmZcANnu3AETt73PIra_coefQ21zBMwoyCe74JvdhGzuzjyX6_5b1YNf2YP5uQnHqqr5TNNkbinXjvIgEgDywDbMwohyE9czLt5jRZWNS3BiqWnV4AJ3blXJPO1UpT9inwUxq7FMBfaj")` }}
              />
              <div className="flex flex-col">
                <p className="font-bold text-text-light-primary dark:text-text-dark-primary">{user.username_kr}</p>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{user.username}</p>
              </div>
            </div>
          </div>
          <div className="py-2">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const ThemeToggleButton = () => {
  const { theme, setTheme } = useAppStore()

  const toggleTheme = () => {
    const newMode = theme.mode === 'dark' ? 'light' : 'dark';
    setTheme({ ...theme, mode: newMode });
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 w-10 bg-white dark:bg-[#2d2938] text-text-light-primary dark:text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0"
      title="Toggle theme"
    >
      <span className="material-symbols-outlined text-xl dark:hidden">dark_mode</span>
      <span className="material-symbols-outlined text-xl hidden dark:inline">light_mode</span>
    </button>
  )
}

export const Header: React.FC = () => {
  const navigate = useNavigate()

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-light dark:border-border-dark px-6 py-3 bg-panel-light dark:bg-panel-dark z-20">
      <div
        className="flex items-center gap-4 text-text-light-primary dark:text-text-dark-primary cursor-pointer"
        onClick={() => navigate('/hub')}
      >
        <div className="size-6 text-primary">
          <img src="/src/assets/logo.png" alt="A2G Platform Logo" className="w-full h-full" />
        </div>
        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">A2G Platform</h2>
      </div>

      <div className="flex flex-1 justify-end items-center gap-4">
        <div className="flex gap-2">
          <ThemeToggleButton />
          <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 w-10 bg-white dark:bg-[#2d2938] text-text-light-primary dark:text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0" title="Notifications">
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
        </div>
        <UserProfile />
      </div>
    </header>
  )
}