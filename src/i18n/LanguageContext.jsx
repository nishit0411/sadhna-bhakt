import { createContext, useCallback, useContext, useMemo, useState } from "react";
import en from "./translations/en.json";
import hi from "./translations/hi.json";
import ru from "./translations/ru.json";

const TRANSLATIONS = { en, hi, ru };

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
];

const STORAGE_KEY = "sadhana_bhakti_language";
const LOCALE_MAP = { en: "en-IN", hi: "hi-IN", ru: "ru-RU" };
const LanguageContext = createContext(null);

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && TRANSLATIONS[stored]) return stored;
  } catch {
    // localStorage unavailable — fall through to default
  }
  return "en";
}

function lookup(dict, key) {
  return key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), dict);
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = useCallback((code) => {
    if (!TRANSLATIONS[code]) return;
    setLanguageState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore — language just won't persist across reloads
    }
  }, []);

  const t = useCallback(
    (key, params) => {
      const value = lookup(TRANSLATIONS[language], key);
      // Graceful fallback to English rather than showing a raw key.
      const fallback = lookup(TRANSLATIONS.en, key);
      let str = typeof value === "string" ? value : typeof fallback === "string" ? fallback : key;
      // `params` may be an interpolation object ({{token}} substitution), or
      // (for a couple of call sites) a plain string default — never used to
      // replace `str` itself, only for {{}} substitution when it's an object.
      if (params && typeof params === "object") {
        for (const [token, replacement] of Object.entries(params)) {
          str = str.replaceAll(`{{${token}}}`, replacement);
        }
      }
      return str;
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t, languages: LANGUAGES, locale: LOCALE_MAP[language] }),
    [language, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within a LanguageProvider");
  return ctx;
}
