/**
 * Settings Page
 *
 * Application settings and preferences.
 *
 * @module pages/SettingsPage
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { GlassCard, Button } from '../components/ui';
import { useTheme } from '../hooks';
import { THEMES } from '../types';
import { changeLanguage, getCurrentLanguage, languageNames, type SupportedLanguage } from '../i18n';

/**
 * Settings page component.
 */
export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = React.useState<SupportedLanguage>(getCurrentLanguage);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    changeLanguage(lang);
  };

  return (
    <motion.div
      className="max-w-2xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h1 className="text-3xl font-bold text-foreground">{t('settings.title')}</h1>

      {/* Theme Selection */}
      <GlassCard>
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('settings.theme')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                theme === t.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <span className="text-2xl">{t.icon}</span>
              <p className="font-medium text-foreground mt-2">{t.name}</p>
              <p className="text-xs text-muted">{t.description}</p>
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Language Selection */}
      <GlassCard>
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('settings.language')}</h2>
        <div className="flex gap-3">
          {(['de', 'en'] as SupportedLanguage[]).map((lang) => (
            <Button
              key={lang}
              variant={language === lang ? 'primary' : 'secondary'}
              onClick={() => handleLanguageChange(lang)}
            >
              {languageNames[lang]}
            </Button>
          ))}
        </div>
      </GlassCard>

      {/* About */}
      <GlassCard>
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('settings.about')}</h2>
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="SwimMerge" className="w-16 h-16 rounded-xl" />
          <div>
            <h3 className="font-bold text-foreground">SwimMerge</h3>
            <p className="text-muted">v1.0.0</p>
            <p className="text-sm text-muted mt-1">
              Intelligent swim data analysis and merging
            </p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default SettingsPage;
