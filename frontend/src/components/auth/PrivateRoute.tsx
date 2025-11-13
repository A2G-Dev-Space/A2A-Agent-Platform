import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { UserRole } from '@/types'

export const PrivateRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 border-purple-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // If user is NEW or REJECTED and not already on signup-request page, redirect there
  if ((user?.role === UserRole.NEW || user?.role === UserRole.REJECTED) && location.pathname !== '/signup-request') {
    return <Navigate to="/signup-request" replace />
  }

  // If user is PENDING and not already on pending-approval page, redirect there
  if (user?.role === UserRole.PENDING && location.pathname !== '/pending-approval') {
    return <Navigate to="/pending-approval" replace />
  }

  return <Outlet />
}