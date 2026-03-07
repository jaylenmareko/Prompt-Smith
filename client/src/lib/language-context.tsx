import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getTranslations, type Translations } from "./i18n";

const LANG_KEY = "ps_language";

interface LanguageContextType {
  lang: string;
  setLang: (lang: string) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(LANG_KEY) || "English");

  const setLang = (newLang: string) => {
    setLangState(newLang);
    localStorage.setItem(LANG_KEY, newLang);
  };

  const t = getTranslations(lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
