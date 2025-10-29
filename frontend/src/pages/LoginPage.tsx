import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/hub');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = () => {
    login();
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-[#212529] dark:text-[#EAEAEA]">
      <div className="layout-container flex h-full grow flex-col">
        <div className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="flex w-full max-w-md flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-6">
              <div className="w-full max-w-[120px] aspect-square rounded-full flex">
                <div
                  className="w-full bg-center bg-no-repeat bg-contain"
                  style={{ backgroundImage: "url('/logo.png')" }}
                ></div>
              </div>
              <div className="flex flex-col gap-3 text-center">
                <p className="text-3xl font-black tracking-[-0.033em] text-[#212529] dark:text-white">{t('login.welcome')}</p>
                <p className="text-base font-normal text-[#6C757D] dark:text-[#ADB5BD]">{t('login.description')}</p>
              </div>
            </div>
            <div className="w-full flex flex-col gap-4">
              <button
                onClick={handleLogin}
                className="flex min-w-[84px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em]"
              >
                <span className="truncate">{t('login.ssoButton')}</span>
              </button>
            </div>
          </div>
        </div>
        <footer className="flex items-center justify-center py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 text-sm text-[#6C757D] dark:text-[#ADB5BD]">
            <span>© 2024 A2G Platform</span>
            <span className="text-black/20 dark:text-white/20">|</span>
            <a className="hover:text-primary" href="#">{t('login.help')}</a>
            <span className="text-black/20 dark:text-white/20">|</span>
            <a className="hover:text-primary" href="#">{t('login.docs')}</a>
          </div>
        </footer>
      </div>
    </div>
  );
};