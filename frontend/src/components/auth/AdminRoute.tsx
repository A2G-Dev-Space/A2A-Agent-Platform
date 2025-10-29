import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { UserRole } from '@/types'

export const AdminRoute: React.FC = () => {
  const { user } = useAuthStore()

  if (!user || user.role !== UserRole.ADMIN) {
    // Redirect them to the /hub page, but save the current location they were
    // trying to go to. This is a good practice for UX, though not strictly
    // required by the current setup.
    return <Navigate to="/hub" replace />
  }

  return <Outlet />
}