"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Language } from "@/lib/i18n";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  preferenceWarning: string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "ekyan-language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, updateLanguage] = useState<Language>("en");
  const [preferenceWarning, setPreferenceWarning] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "sw") updateLanguage(saved);
    } catch (error) {
      setPreferenceWarning(error instanceof Error ? error.message : "Language preference could not be loaded.");
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "sw" ? "sw-KE" : "en-KE";
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    updateLanguage(nextLanguage);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
      setPreferenceWarning("");
    } catch (error) {
      setPreferenceWarning(error instanceof Error ? error.message : "Language preference could not be saved.");
    }
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, preferenceWarning }),
    [language, setLanguage, preferenceWarning],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider.");
  return context;
}
