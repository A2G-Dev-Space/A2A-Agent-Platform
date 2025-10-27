import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useApiKeyStore } from '@/store/useApiKeyStore';
import { useThemeStore } from '@/store/useThemeStore';
import Sidebar from './Sidebar';
import Header from './Header';
import PendingApprovalPage from '@/pages/PendingApprovalPage';

export default function Layout() {
  const { role, checkAuthAndLogin, isAuthenticated } = useAuthStore();
  const fetchActiveApiKey = useApiKeyStore((state) => state.fetchActiveApiKey);
  const theme = useThemeStore((state) => state.theme);
  const location = useLocation();

  // Handle SSO callback and authentication
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
      // Token from SSO callback
      checkAuthAndLogin(token);
      window.history.replaceState({}, document.title, location.pathname);
      fetchActiveApiKey();
    } else {
      // Check existing token
      checkAuthAndLogin(null);
    }
  }, [location.search, checkAuthAndLogin]);

  // Fetch API key when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchActiveApiKey();
    }
  }, [isAuthenticated, fetchActiveApiKey]);

  // Show pending approval page for PENDING users
  if (isAuthenticated && role === 'PENDING') {
    return <PendingApprovalPage />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-950" data-theme={theme}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
