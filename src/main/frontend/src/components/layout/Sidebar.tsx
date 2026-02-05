/**
 * Sidebar Component
 *
 * Main navigation sidebar with glassmorphic styling, profile section,
 * and theme switcher.
 *
 * @module components/layout/Sidebar
 */

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Activity,
  Upload,
  BarChart2,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Waves,
  Palette,
} from 'lucide-react';
import clsx from 'clsx';

import { useTheme } from '../../hooks';
import type { ThemeId } from '../../types';
import { THEMES } from '../../types';

export interface SidebarProps {
  /** Additional CSS classes */
  className?: string;
}

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/', labelKey: 'nav.dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { path: '/activities', labelKey: 'nav.activities', icon: <Activity className="w-5 h-5" /> },
  { path: '/import', labelKey: 'nav.import', icon: <Upload className="w-5 h-5" /> },
  { path: '/analysis', labelKey: 'nav.analysis', icon: <BarChart2 className="w-5 h-5" /> },
  { path: '/community', labelKey: 'nav.community', icon: <Users className="w-5 h-5" /> },
  { path: '/settings', labelKey: 'nav.settings', icon: <Settings className="w-5 h-5" /> },
];

const themeIcons: Record<ThemeId, React.ReactNode> = {
  'light': <Sun className="w-4 h-4" />,
  'dark': <Moon className="w-4 h-4" />,
  'pool-blue': <Waves className="w-4 h-4" />,
  'gold-medal': <span className="text-sm">🥇</span>,
  'blue-matrix': <span className="text-sm">💎</span>,
  'blue-wave': <span className="text-sm">🌊</span>,
};

/**
 * Sidebar component with navigation and theme switching.
 *
 * @example
 * ```tsx
 * <Sidebar />
 * ```
 */
export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  return (
    <motion.aside
      className={clsx(
        'fixed left-0 top-0 h-screen z-40',
        'glass-card border-r border-border rounded-none',
        'flex flex-col',
        isCollapsed ? 'w-20' : 'w-64',
        'transition-all duration-300',
        className
      )}
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }}
    >
      {/* Logo & Brand */}
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <img
          src="/logo.png"
          alt="SwimMerge"
          className="w-10 h-10 rounded-xl"
        />
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="overflow-hidden"
            >
              <h1 className="text-lg font-bold text-foreground whitespace-nowrap">
                {t('app.title')}
              </h1>
              <p className="text-xs text-muted whitespace-nowrap">
                {t('app.subtitle')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Profile Section */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <img
            src="/profile.jpg"
            alt="Profile"
            className="w-10 h-10 rounded-full ring-2 ring-primary/50"
          />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden"
              >
                <p className="font-medium text-foreground whitespace-nowrap">Swimmer</p>
                <p className="text-xs text-muted whitespace-nowrap">Personal Stats</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                'hover:bg-surface-hover',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted hover:text-foreground'
              )
            }
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  {t(item.labelKey)}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* Theme Picker */}
      <div className="p-4 border-t border-border">
        <div className="relative">
          <button
            onClick={() => setShowThemePicker(!showThemePicker)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl',
              'text-muted hover:text-foreground hover:bg-surface-hover',
              'transition-colors'
            )}
          >
            <Palette className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="whitespace-nowrap"
                >
                  {t('settings.theme')}
                </motion.span>
              )}
            </AnimatePresence>
            {!isCollapsed && (
              <span className="ml-auto">{themeIcons[theme]}</span>
            )}
          </button>

          {/* Theme dropdown */}
          <AnimatePresence>
            {showThemePicker && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={clsx(
                  'absolute bottom-full left-0 mb-2',
                  'glass-card p-2 rounded-xl shadow-xl',
                  isCollapsed ? 'w-48 -left-2' : 'w-full'
                )}
              >
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      setShowThemePicker(false);
                    }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
                      'text-sm transition-colors',
                      theme === t.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted hover:text-foreground hover:bg-surface-hover'
                    )}
                  >
                    <span>{t.icon}</span>
                    <span>{t.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={clsx(
          'absolute -right-3 top-1/2 -translate-y-1/2',
          'w-6 h-6 rounded-full',
          'bg-surface border border-border shadow-sm',
          'flex items-center justify-center',
          'text-muted hover:text-foreground',
          'transition-colors z-50'
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </motion.aside>
  );
};

export default Sidebar;
