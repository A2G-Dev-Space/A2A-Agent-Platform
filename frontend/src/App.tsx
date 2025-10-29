import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { WorkbenchDashboard } from '@/components/workbench/WorkbenchDashboard'
import { HubDashboard } from '@/components/hub/HubDashboard'
import { FlowDashboard } from '@/components/flow/FlowDashboard'
import { LoginPage } from '@/pages/LoginPage'
import { CallbackPage } from '@/pages/CallbackPage'
import { PendingApprovalPage } from '@/pages/PendingApprovalPage'
import { PrivateRoute } from '@/components/auth/PrivateRoute'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { UserRole } from '@/types'

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
  const { theme } = useAppStore()

  // Apply theme
  useEffect(() => {
    if (theme.mode === 'dark' ||
        (theme.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />

          {/* Protected Routes */}
          <Route element={<PrivateRoute />}>
            {/* Check for pending users */}
            {user?.role === UserRole.PENDING ? (
              <Route path="*" element={<Navigate to="/pending-approval" replace />} />
            ) : (
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
                <Route path="/settings/*" element={<div>Settings Coming Soon</div>} />

                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            )}
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
