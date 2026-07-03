import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import de from '../i18n/de.js';
import en from '../i18n/en.js';

const DICTIONARIES = { de, en };
const LANGUAGE_KEY = 'pitwall.language';

const LanguageContext = createContext(null);

function resolve(dict, key) {
  return key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), dict);
}

function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));
}

function detectDefaultLanguage() {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored && DICTIONARIES[stored]) return stored;
  const browserLang = (navigator.language || 'de').slice(0, 2);
  return DICTIONARIES[browserLang] ? browserLang : 'de';
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(detectDefaultLanguage);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang) => {
    if (DICTIONARIES[lang]) setLanguageState(lang);
  }, []);

  const t = useCallback(
    (key, vars) => {
      const value = resolve(DICTIONARIES[language], key) ?? resolve(DICTIONARIES.de, key);
      if (value === undefined) return key;
      return typeof value === 'string' ? interpolate(value, vars) : value;
    },
    [language]
  );

  const tRole = useCallback((role) => resolve(DICTIONARIES[language], `roles.${role}`) || role, [language]);

  const locale = language === 'de' ? 'de-DE' : 'en-GB';

  const value = useMemo(
    () => ({ language, setLanguage, t, tRole, locale }),
    [language, setLanguage, t, tRole, locale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
