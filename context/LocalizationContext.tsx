import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { getTranslations } from '../services/api';
import { UI_TEXT, UIKey } from '../i18n/keys';
import { LANGUAGES } from '../constants';

interface LocalizationContextType {
  language: string;
  setLanguage: (language: string) => void;
  t: (key: UIKey, replacements?: Record<string, string>) => string;
  isLoading: boolean;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<string>('');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchTranslations = async () => {
      if (!language || language === 'en') {
        setTranslations({}); // Reset to defaults if English
        return;
      }
      
      const languageName = LANGUAGES.find(l => l.code === language)?.name;
      if (!languageName) return;

      setIsLoading(true);
      try {
        const fetchedTranslations = await getTranslations(languageName, UI_TEXT);
        setTranslations(fetchedTranslations);
      } catch (error) {
        console.error("Failed to fetch translations:", error);
        setTranslations({}); // Fallback to default on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranslations();
  }, [language]);

  const t = useCallback((key: UIKey, replacements?: Record<string, string>): string => {
    let translatedString = translations[key] || UI_TEXT[key];
    
    if (replacements) {
      Object.entries(replacements).forEach(([placeholder, value]) => {
        translatedString = translatedString.replace(`{${placeholder}}`, value);
      });
    }

    return translatedString;
  }, [translations]);

  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t, isLoading }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
