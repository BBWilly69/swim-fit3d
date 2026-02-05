/**
 * useTheme Hook
 *
 * Provides theme management functionality.
 * Reads and sets the data-theme attribute on the document.
 *
 * @module hooks/useTheme
 */

import { useState, useEffect, useCallback } from 'react';

export type ThemeId = 'light' | 'dark' | 'pool-blue' | 'gold-medal' | 'blue-matrix' | 'blue-wave';

const THEME_STORAGE_KEY = 'swimmerge-theme';
const DEFAULT_THEME: ThemeId = 'dark';

/**
 * Hook for managing application theme.
 *
 * @returns Object with current theme and setTheme function
 *
 * @example
 * ```tsx
 * const { theme, setTheme, themes } = useTheme();
 *
 * return (
 *   <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeId)}>
 *     {themes.map((t) => (
 *       <option key={t} value={t}>{t}</option>
 *     ))}
 *   </select>
 * );
 * ```
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isValidTheme(stored)) return stored as ThemeId;

    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }

    return DEFAULT_THEME;
  });

  const themes: ThemeId[] = ['light', 'dark', 'pool-blue', 'gold-medal', 'blue-matrix', 'blue-wave'];

  const setTheme = useCallback((newTheme: ThemeId) => {
    if (!isValidTheme(newTheme)) return;

    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, []);

  // Apply theme on mount and when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      // Only update if user hasn't explicitly set a preference
      if (!stored) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setTheme]);

  return { theme, setTheme, themes };
}

function isValidTheme(theme: string): theme is ThemeId {
  return ['light', 'dark', 'pool-blue', 'gold-medal', 'blue-matrix', 'blue-wave'].includes(theme);
}

export default useTheme;
