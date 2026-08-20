import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SupportedLanguage } from '../types';
import { TranslationDictionary, translations } from '../utils/i18n';

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: keyof TranslationDictionary, fallback?: string, params?: Record<string, string | number>) => string;
  tObj: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function detectInitialLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem('barberpilot_language') || localStorage.getItem('barbergo_language');
    if (saved && ['en', 'es', 'zh', 'th', 'ko', 'ja', 'vi', 'fr'].includes(saved)) {
      return saved as SupportedLanguage;
    }
  } catch {}

  const navLang = (
    typeof navigator !== 'undefined'
      ? (navigator.language || (navigator.languages && navigator.languages[0]) || '')
      : ''
  ).toLowerCase();

  if (navLang.startsWith('th')) return 'th';
  if (navLang.startsWith('es')) return 'es';
  if (navLang.startsWith('zh')) return 'zh';
  if (navLang.startsWith('ja')) return 'ja';
  if (navLang.startsWith('ko')) return 'ko';
  if (navLang.startsWith('vi')) return 'vi';
  if (navLang.startsWith('fr')) return 'fr';
  return 'en';
}

export const LanguageProvider: React.FC<{ children: ReactNode; initialLang?: SupportedLanguage }> = ({
  children,
  initialLang,
}) => {
  const [currentLanguage, setCurrentLanguageState] = useState<SupportedLanguage>(
    initialLang || detectInitialLanguage()
  );

  const setLanguage = (lang: SupportedLanguage) => {
    setCurrentLanguageState(lang);
    try {
      localStorage.setItem('barberpilot_language', lang);
      localStorage.setItem('barbergo_language', lang);
    } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLanguage;
    }
    try {
      localStorage.setItem('barberpilot_language', currentLanguage);
    } catch {}
  }, [currentLanguage]);

  const t = (key: keyof TranslationDictionary, fallback?: string, params?: Record<string, string | number>): string => {
    const dict = translations[currentLanguage] || translations['en'];
    let str = dict[key];

    if (!str) {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.warn('[i18n] Missing translation key: ' + String(key));
      }
      str = translations['en'][key] || fallback || String(key);
    }

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        str = str.replace(new RegExp('\{' + paramKey + '\}', 'g'), String(value));
      });
    }

    return str;
  };

  const tObj = translations[currentLanguage] || translations['en'];

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t, tObj }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};

export const useTranslation = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      t: (key: keyof TranslationDictionary, fallback?: string) => translations['en'][key] || fallback || String(key),
      currentLanguage: 'en' as SupportedLanguage,
      setLanguage: () => {},
      tObj: translations['en'],
    };
  }
  return ctx;
};
