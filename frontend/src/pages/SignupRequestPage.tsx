import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { UserCheck, Info } from 'lucide-react'
import api from '@/services/api'

export const SignupRequestPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, loginCallback } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSignupRequest = async () => {
    try {
      setIsSubmitting(true)

      // Call signup request API
      await api.post('/v1/users/signup-request/')

      // Clear auth and redirect to login to get new token with PENDING role
      localStorage.removeItem('auth-storage')
      localStorage.removeItem('accessToken')
      window.location.href = '/login'
    } catch (error: any) {
      console.error('Signup request error:', error)
      alert(error.response?.data?.detail || 'Failed to submit signup request')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Icon */}
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full mx-auto mb-6 flex items-center justify-center">
            <UserCheck size={32} className="text-purple-600 dark:text-purple-400" />
          </div>

          {/* Title - Bilingual */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            {t('signupRequest.titleKo')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 text-center mb-6">
            {t('signupRequest.title')}
          </p>

          {/* User Info */}
          {user && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('signupRequest.nameLabel')}:</span>
                  <span className="text-sm font-medium">{user.username_kr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('signupRequest.usernameLabel')}:</span>
                  <span className="text-sm font-medium">{user.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('signupRequest.emailLabel')}:</span>
                  <span className="text-sm font-medium">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('signupRequest.departmentLabel')}:</span>
                  <span className="text-sm font-medium">{user.department_kr}</span>
                </div>
              </div>
            </div>
          )}

          {/* Info Message */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-1">
                  {t('signupRequest.infoTitle')}
                </p>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• {t('signupRequest.step1')}</li>
                  <li>• {t('signupRequest.step2')}</li>
                  <li>• {t('signupRequest.step3')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Signup Request Button */}
          <div className="space-y-3">
            <button
              onClick={handleSignupRequest}
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('signupRequest.submitting')}
                </>
              ) : (
                <>
                  <UserCheck size={20} />
                  {t('signupRequest.submitButton')}
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('signupRequest.needHelp')}{' '}
              <a href="mailto:admin@a2g-platform.com" className="text-purple-600 hover:text-purple-700 dark:text-purple-400">
                {t('signupRequest.contactAdmin')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
