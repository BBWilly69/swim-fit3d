/**
 * Community Page
 *
 * Community comparison and rankings.
 *
 * @module pages/CommunityPage
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';

import { GlassCard } from '../components/ui';

/**
 * Community page component.
 */
export const CommunityPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <GlassCard>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <motion.div
            className="text-6xl mb-4"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Users className="w-16 h-16 text-primary" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {t('nav.community')}
          </h2>
          <p className="text-muted">Coming soon - Community comparison</p>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default CommunityPage;
