import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LogIn, Shield, Bot } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading, error } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/hub')
    }
  }, [isAuthenticated, navigate])

  const handleLogin = () => {
    console.log('Login button clicked')
    login()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <Bot size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            A2G Platform
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Agent Generation & Management Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Welcome Back
          </h2>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <Shield size={20} />
              <span className="text-sm">Secure SSO Authentication</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <Bot size={20} />
              <span className="text-sm">Access to AI Agent Platform</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="loading-spinner" />
                Redirecting to SSO...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Login with SSO
              </>
            )}
          </button>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By logging in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>© 2025 A2G Platform Development Team</p>
          <p className="mt-2">
            Need help?{' '}
            <a href="#" className="text-purple-600 hover:text-purple-700 dark:text-purple-400">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}