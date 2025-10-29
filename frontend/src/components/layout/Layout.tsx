import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Toaster } from 'react-hot-toast'

export const Layout: React.FC = () => {
  return (
    <div className="flex h-screen w-full bg-background-light dark:bg-background-dark font-display text-text-light-primary dark:text-text-dark-primary">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937', // panel-dark
            color: '#f9fafb', // text-dark-primary
          },
          success: {
            duration: 3000,
            style: {
              background: '#0d9488', // accent-dark
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#ef4444', // A standard red
            },
          },
        }}
      />
    </div>
  )
}