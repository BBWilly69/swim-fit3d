/**
 * Theme Utility Functions
 *
 * Manages theme switching and persistence for the application.
 *
 * @module utils/theme
 */

import type { ThemeId } from '../types';

/** LocalStorage key for theme persistence */
const THEME_STORAGE_KEY = 'swimmerge-theme';

/** Default theme */
const DEFAULT_THEME: ThemeId = 'pool-blue';

/**
 * Gets the currently active theme from localStorage or system preference.
 *
 * @returns The current theme ID
 */
export function getCurrentTheme(): ThemeId {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
  if (stored && isValidTheme(stored)) {
    return stored;
  }

  // Check system preference for dark mode
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return DEFAULT_THEME;
}

/**
 * Validates if a string is a valid theme ID.
 *
 * @param theme - The theme string to validate
 * @returns True if the theme is valid
 */
export function isValidTheme(theme: string): theme is ThemeId {
  return ['light', 'dark', 'pool-blue', 'gold-medal', 'blue-matrix', 'blue-wave'].includes(theme);
}

/**
 * Applies a theme to the document.
 *
 * @param theme - The theme ID to apply
 */
export function applyTheme(theme: ThemeId): void {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  const themeColors: Record<ThemeId, string> = {
    light: '#ffffff',
    dark: '#0f172a',
    'pool-blue': '#0c4a6e',
    'gold-medal': '#78350f',
    'blue-matrix': '#020617',
    'blue-wave': '#164e63',
  };

  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', themeColors[theme]);
  }
}

/**
 * Initializes the theme on app startup.
 * Should be called as early as possible to prevent flash.
 */
export function initializeTheme(): void {
  const theme = getCurrentTheme();
  applyTheme(theme);
}

/**
 * Cycles to the next theme in the list.
 *
 * @returns The new theme ID
 */
export function cycleTheme(): ThemeId {
  const themes: ThemeId[] = ['light', 'dark', 'pool-blue', 'gold-medal', 'blue-matrix', 'blue-wave'];
  const current = getCurrentTheme();
  const currentIndex = themes.indexOf(current);
  const nextIndex = (currentIndex + 1) % themes.length;
  const nextTheme = themes[nextIndex];

  applyTheme(nextTheme);
  return nextTheme;
}

/**
 * Gets theme-specific class names for components.
 *
 * @param baseClass - The base class name
 * @param variants - Theme-specific variants
 * @returns Combined class string
 */
export function getThemeClasses(
  baseClass: string,
  variants?: Partial<Record<ThemeId, string>>
): string {
  const theme = getCurrentTheme();
  const themeVariant = variants?.[theme] ?? '';
  return `${baseClass} ${themeVariant}`.trim();
}

/**
 * Checks if the current theme is a dark theme.
 *
 * @returns True if the theme is dark
 */
export function isDarkTheme(): boolean {
  const theme = getCurrentTheme();
  return ['dark', 'blue-matrix', 'blue-wave'].includes(theme);
}

/**
 * Gets the appropriate chart color scheme for the current theme.
 *
 * @returns Array of colors for charts
 */
export function getChartColors(): string[] {
  const theme = getCurrentTheme();

  const colorSchemes: Record<ThemeId, string[]> = {
    light: ['#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'],
    dark: ['#38bdf8', '#fbbf24', '#34d399', '#f87171', '#a78bfa', '#f472b6'],
    'pool-blue': ['#22d3ee', '#fbbf24', '#4ade80', '#fb7185', '#c4b5fd', '#f9a8d4'],
    'gold-medal': ['#fcd34d', '#fb923c', '#a3e635', '#f87171', '#c084fc', '#f472b6'],
    'blue-matrix': ['#22d3ee', '#34d399', '#a78bfa', '#f472b6', '#fbbf24', '#fb7185'],
    'blue-wave': ['#67e8f9', '#5eead4', '#a5b4fc', '#fda4af', '#fcd34d', '#c084fc'],
  };

  return colorSchemes[theme];
}

/**
 * Gets the stroke color for a swim stroke type.
 *
 * @param stroke - The stroke type
 * @returns Hex color code
 */
export function getStrokeColor(stroke: string): string {
  const strokeColors: Record<string, string> = {
    FREESTYLE: '#0ea5e9',
    BACKSTROKE: '#8b5cf6',
    BREASTSTROKE: '#10b981',
    BUTTERFLY: '#f59e0b',
    MEDLEY: '#ec4899',
    DRILL: '#6b7280',
    MIXED: '#64748b',
  };

  return strokeColors[stroke] ?? '#6b7280';
}
