import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { WorkbenchDashboard } from '@/components/workbench/WorkbenchDashboard'
import { HubDashboard } from '@/components/hub/HubDashboard'
import { FlowDashboard } from '@/components/flow/FlowDashboard'
import { LoginPage } from '@/pages/LoginPage'
import { CallbackPage } from '@/pages/CallbackPage'
import { SignupRequestPage } from '@/pages/SignupRequestPage'
import { PendingApprovalPage } from '@/pages/PendingApprovalPage'
import { PrivateRoute } from '@/components/auth/PrivateRoute'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import SettingsPage from '@/pages/Settings/SettingsPage'
import GeneralSettingsPage from '@/pages/Settings/GeneralSettingsPage'
import UserManagementPage from '@/pages/Settings/UserManagementPage'
import LlmManagementPage from '@/pages/Settings/LlmManagementPage'
import PlatformKeysPage from '@/pages/Settings/PlatformKeysPage'
import StatisticsPage from '@/pages/Settings/StatisticsPage'

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const { user } = useAuthStore()
  const { initTheme } = useThemeStore()

  // Initialize theme when user is authenticated
  useEffect(() => {
    if (user) {
      initTheme()
    }
  }, [user, initTheme])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/callback" element={<CallbackPage />} />

          {/* Protected Routes */}
          <Route element={<PrivateRoute />}>
            {/* Signup Request Page - accessible only when logged in with NEW or REJECTED role */}
            <Route path="/signup-request" element={<SignupRequestPage />} />

            {/* Pending Approval Page - accessible only when logged in with PENDING role */}
            <Route path="/pending-approval" element={<PendingApprovalPage />} />

            {/* Main App Routes - accessible only with USER or ADMIN role */}
            <Route element={<Layout />}>
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/hub" replace />} />

              {/* Hub Mode */}
              <Route path="/hub" element={<HubDashboard />} />

              {/* Workbench Mode */}
              <Route path="/workbench" element={<WorkbenchDashboard />} />

              {/* Flow Mode */}
              <Route path="/flow" element={<FlowDashboard />} />

              {/* Settings */}
              <Route path="/settings" element={<SettingsPage />}>
                <Route index element={<Navigate to="general" replace />} />
                <Route path="general" element={<GeneralSettingsPage />} />
                <Route path="platform-keys" element={<PlatformKeysPage />} />
                <Route path="user-management" element={<UserManagementPage />} />
                <Route path="llm-management" element={<LlmManagementPage />} />
                <Route path="statistics" element={<StatisticsPage />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// Simple 404 Page
const NotFoundPage: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-700">404</h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 mt-4">Page not found</p>
      <a href="/hub" className="btn btn-primary mt-6 inline-block">
        Go to Home
      </a>
    </div>
  </div>
)

export default App
