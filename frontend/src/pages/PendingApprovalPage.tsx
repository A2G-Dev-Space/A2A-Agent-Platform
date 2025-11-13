import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { Clock, Info, LogOut } from 'lucide-react'

export const PendingApprovalPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Icon */}
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Clock size={32} className="text-yellow-600 dark:text-yellow-400" />
          </div>

          {/* Title - Bilingual */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            {t('pendingApproval.titleKo')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 text-center mb-4">
            {t('pendingApproval.title')}
          </p>

          {/* User Info */}
          {user && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('pendingApproval.nameLabel')}:</span>
                  <span className="text-sm font-medium">{user.username_kr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('pendingApproval.usernameLabel')}:</span>
                  <span className="text-sm font-medium">{user.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('pendingApproval.emailLabel')}:</span>
                  <span className="text-sm font-medium">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('pendingApproval.departmentLabel')}:</span>
                  <span className="text-sm font-medium">{user.department_kr}</span>
                </div>
              </div>
            </div>
          )}

          {/* Info Message */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-1">
                  {t('pendingApproval.whatNextTitle')}
                </p>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• {t('pendingApproval.step1')}</li>
                  <li>• {t('pendingApproval.step2')}</li>
                  <li>• {t('pendingApproval.step3')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
            >
              {t('pendingApproval.checkStatus')}
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-2 px-4 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              {t('pendingApproval.logout')}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('pendingApproval.needAccess')}{' '}
              <a href="mailto:admin@a2g-platform.com" className="text-purple-600 hover:text-purple-700 dark:text-purple-400">
                {t('pendingApproval.contactAdmin')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}