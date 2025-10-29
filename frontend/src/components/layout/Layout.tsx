import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { Toaster } from 'react-hot-toast';

export const Layout: React.FC = () => {
  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <Outlet />
        </main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'dark:bg-slate-700 dark:text-white',
        }}
      />
    </div>
  );
};