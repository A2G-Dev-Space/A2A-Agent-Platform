import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import ko from './locales/ko.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { ...en },
      ko: { ...ko },
    },
    fallbackLng: 'ko',
    debug: true,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

export default i18n;