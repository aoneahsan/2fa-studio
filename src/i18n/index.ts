/**
 * i18n Configuration
 * Internationalization setup for 2FA Studio
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Import translation resources
import enTranslations from './locales/en/common.json';
import esTranslations from './locales/es/common.json';
import frTranslations from './locales/fr/common.json';
import deTranslations from './locales/de/common.json';
import zhTranslations from './locales/zh/common.json';
import jaTranslations from './locales/ja/common.json';
import koTranslations from './locales/ko/common.json';
import ruTranslations from './locales/ru/common.json';
import ptTranslations from './locales/pt/common.json';
import itTranslations from './locales/it/common.json';
import arTranslations from './locales/ar/common.json';
import heTranslations from './locales/he/common.json';

export const resources = {
  en: { common: enTranslations },
  es: { common: esTranslations },
  fr: { common: frTranslations },
  de: { common: deTranslations },
  zh: { common: zhTranslations },
  ja: { common: jaTranslations },
  ko: { common: koTranslations },
  ru: { common: ruTranslations },
  pt: { common: ptTranslations },
  it: { common: itTranslations },
  ar: { common: arTranslations },
  he: { common: heTranslations }
};

export const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸', rtl: false },
  { code: 'es', name: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', rtl: false },
  { code: 'zh', name: '中文', flag: '🇨🇳', rtl: false },
  { code: 'ja', name: '日本語', flag: '🇯🇵', rtl: false },
  { code: 'ko', name: '한국어', flag: '🇰🇷', rtl: false },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', rtl: false },
  { code: 'pt', name: 'Português', flag: '🇵🇹', rtl: false },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', rtl: false },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'he', name: 'עברית', flag: '🇮🇱', rtl: true }
];

// RTL languages
export const rtlLanguages = ['ar', 'he'];

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    },
    
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json'
    }
  });

export default i18n;