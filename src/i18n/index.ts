import polyglotI18nProvider from "ra-i18n-polyglot";
import { en } from "./en";
import { fr } from "./fr";
import { pt } from "./pt";
import { de } from "./de";

const STORAGE_KEY = "nuno.locale";
const DEFAULT_LOCALE = "fr";
const SUPPORTED = ["en", "fr", "pt", "de"] as const;
export type SupportedLocale = (typeof SUPPORTED)[number];

const dictionaries: Record<SupportedLocale, any> = { en, fr, pt, de };

const readInitialLocale = (): SupportedLocale => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED as readonly string[]).includes(stored)) {
      return stored as SupportedLocale;
    }
  } catch {
    // localStorage unavailable — fall through
  }
  return DEFAULT_LOCALE;
};

export const i18nProvider = polyglotI18nProvider(
  (locale) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore
    }
    return dictionaries[locale as SupportedLocale] ?? dictionaries[DEFAULT_LOCALE];
  },
  readInitialLocale(),
  [
    { locale: "en", name: "English" },
    { locale: "fr", name: "Français" },
    { locale: "pt", name: "Português" },
    { locale: "de", name: "Deutsch" },
  ],
  { allowMissing: true },
);
