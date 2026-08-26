import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Language, Content, UIStrings } from '../types';
import { translations } from '../data/translations';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  content: Content;
  ui: UIStrings;
}

const STORAGE_KEY = 'clagtee-lang';

const isValidLanguage = (val: string | null): val is Language =>
  val === 'es' || val === 'pt' || val === 'en';

const getInitialLanguage = (): Language => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isValidLanguage(stored)) return stored;
  } catch {
    // localStorage unavailable
  }
  return 'es';
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage unavailable
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    content: translations[language].content,
    ui: translations[language].ui,
  }), [language, setLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
