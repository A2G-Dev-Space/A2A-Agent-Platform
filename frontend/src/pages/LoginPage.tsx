import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'

const ThemeToggleButton = () => {
  const { theme, setTheme } = useAppStore()

  const toggleTheme = () => {
    const newMode = theme.mode === 'dark' ? 'light' : 'dark';
    setTheme({ ...theme, mode: newMode });
  }

  return (
    <button onClick={toggleTheme} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-[#6C757D] dark:text-[#ADB5BD]">
      <span className="material-symbols-outlined dark:hidden">dark_mode</span>
      <span className="material-symbols-outlined hidden dark:inline">light_mode</span>
    </button>
  )
}


export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login, ssoLogin, isAuthenticated, isLoading, error } = useAuthStore()
  const [token, setToken] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/hub')
    }
  }, [isAuthenticated, navigate])

  const handleSsoLogin = () => {
    ssoLogin()
  }

  const handleTokenLogin = () => {
    if (token) {
      login(token)
    }
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-[#212529] dark:text-[#EAEAEA]">
      <div className="absolute top-6 right-6">
        <ThemeToggleButton />
      </div>
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="flex w-full max-w-md flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-[120px] aspect-square rounded-full flex">
              <div className="w-full bg-center bg-no-repeat bg-contain" style={{ backgroundImage: `url('/src/assets/logo.png')` }}></div>
            </div>
            <div className="flex flex-col gap-3 text-center">
              <p className="text-3xl font-black tracking-[-0.033em] text-[#212529] dark:text-white">Welcome to A2G</p>
              <p className="text-base font-normal text-[#6C757D] dark:text-[#ADB5BD]">Access your Workbench, Hub, and Flow.</p>
            </div>
          </div>
          <div className="w-full flex flex-col gap-4">
            <button
              onClick={handleSsoLogin}
              disabled={isLoading}
              className="flex min-w-[84px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] disabled:opacity-50"
            >
              {isLoading ? 'Redirecting...' : 'Continue with SSO'}
            </button>
            <div className="flex flex-col">
              <details className="flex flex-col border-t border-t-black/10 dark:border-t-white/10 py-2 group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-2">
                  <p className="text-sm font-medium text-[#6C757D] dark:text-[#ADB5BD]">Use a token instead</p>
                  <div className="text-[#6C757D] dark:text-[#ADB5BD] transition-transform duration-200 group-open:rotate-180">
                    <span className="material-symbols-outlined text-xl">expand_more</span>
                  </div>
                </summary>
                <div className="flex max-w-[480px] flex-wrap items-end gap-4 pb-2">
                  <label className="flex flex-col min-w-40 flex-1">
                    <p className="text-sm font-medium pb-2 text-[#212529] dark:text-white">JWT Token</p>
                    <input
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg focus:outline-0 focus:ring-0 border border-black/10 bg-white dark:border-white/10 dark:bg-white/5 focus:border-primary h-12 placeholder:text-[#6C757D] dark:placeholder:text-[#ADB5BD] px-4 py-2 text-base font-normal leading-normal text-[#212529] dark:text-white"
                      placeholder="Enter your JWT token"
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                    />
                  </label>
                  <button
                    onClick={handleTokenLogin}
                    disabled={isLoading || !token}
                    className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-gray-200 dark:bg-[#2d2938] text-sm font-bold leading-normal tracking-[0.015em] disabled:opacity-50"
                  >
                    Login
                  </button>
                </div>
              </details>
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </div>
        </div>
      </div>
      <footer className="flex items-center justify-center py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 text-sm text-[#6C757D] dark:text-[#ADB5BD]">
          <span>© 2024 A2G Platform</span>
          <span className="text-black/20 dark:text-white/20">|</span>
          <a className="hover:text-primary" href="#">Help</a>
          <span className="text-black/20 dark:text-white/20">|</span>
          <a className="hover:text-primary" href="#">Docs</a>
        </div>
      </footer>
    </div>
  )
}