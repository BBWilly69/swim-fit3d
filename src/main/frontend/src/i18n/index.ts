/**
 * i18n Configuration Module
 *
 * Initializes react-i18next with German and English translations.
 * Default language is German, with browser language detection as fallback.
 *
 * @module i18n
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './de.json';
import en from './en.json';

/** Supported language codes */
export type SupportedLanguage = 'de' | 'en';

/** Language display names for UI */
export const languageNames: Record<SupportedLanguage, string> = {
  de: 'Deutsch',
  en: 'English',
};

/** Available languages with their resources */
const resources = {
  de: { translation: de },
  en: { translation: en },
};

/**
 * Detects the user's preferred language from browser settings.
 * Falls back to German if no supported language is detected.
 *
 * @returns The detected language code
 */
function detectLanguage(): SupportedLanguage {
  const stored = localStorage.getItem('swimmerge-language');
  if (stored && (stored === 'de' || stored === 'en')) {
    return stored;
  }

  const browserLang = navigator.language.split('-')[0];
  if (browserLang === 'de' || browserLang === 'en') {
    return browserLang;
  }

  return 'de';
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectLanguage(),
    fallbackLng: 'de',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: true,
    },
  });

/**
 * Changes the current language and persists the selection.
 *
 * @param lang - The language code to switch to
 */
export function changeLanguage(lang: SupportedLanguage): void {
  localStorage.setItem('swimmerge-language', lang);
  i18n.changeLanguage(lang);
}

/**
 * Gets the current language.
 *
 * @returns The current language code
 */
export function getCurrentLanguage(): SupportedLanguage {
  return i18n.language as SupportedLanguage;
}

export default i18n;
