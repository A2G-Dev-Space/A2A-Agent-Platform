import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { CheckCircle, XCircle, Loader } from 'lucide-react'

export const CallbackPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { loginCallback } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      // Get ID token from URL params
      const idToken = searchParams.get('id_token')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (error) {
        setError(errorDescription || t('callback.errorAuthFailed'))
        setIsProcessing(false)
        return
      }

      if (!idToken) {
        setError(t('callback.errorNoToken'))
        setIsProcessing(false)
        return
      }

      // Process the callback
      await loginCallback(idToken)

      // Navigate to the main page
      navigate('/hub', { replace: true })
    } catch (err: any) {
      console.error('Callback error:', err)
      setError(err.message || t('callback.errorFailedComplete'))
      setIsProcessing(false)
    }
  }

  const handleRetry = () => {
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {isProcessing ? (
            <div className="text-center">
              <Loader size={48} className="text-purple-600 animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('callback.completingAuth')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {t('callback.pleaseWait')}
              </p>
            </div>
          ) : error ? (
            <div className="text-center">
              <XCircle size={48} className="text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('callback.authFailed')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {error}
              </p>
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                {t('callback.tryAgain')}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('callback.authSuccessful')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {t('callback.redirecting')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}