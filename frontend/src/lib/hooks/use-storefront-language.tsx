'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { storefrontTranslations, type StorefrontLang, type StorefrontTranslations } from '@/lib/i18n/storefront';

interface StorefrontLanguageContextValue {
  lang: StorefrontLang;
  setLang: (lang: StorefrontLang) => void;
  t: StorefrontTranslations;
  dir: 'ltr' | 'rtl';
}

const StorefrontLanguageContext = createContext<StorefrontLanguageContextValue>({
  lang: 'fr',
  setLang: () => {},
  t: storefrontTranslations.fr,
  dir: 'ltr',
});

const SF_STORAGE_KEY = 'sf-lang';

export function StorefrontLanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<StorefrontLang>('fr');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(SF_STORAGE_KEY) as StorefrontLang | null;
    if (saved && storefrontTranslations[saved]) {
      setLangState(saved);
    }
    setMounted(true);
  }, []);

  const setLang = (newLang: StorefrontLang) => {
    localStorage.setItem(SF_STORAGE_KEY, newLang);
    setLangState(newLang);
  };

  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr';

  if (!mounted) {
    return null;
  }

  return (
    <StorefrontLanguageContext.Provider value={{ lang, setLang, t: storefrontTranslations[lang], dir }}>
      {children}
    </StorefrontLanguageContext.Provider>
  );
}

export function useStorefrontLanguage() {
  return useContext(StorefrontLanguageContext);
}
