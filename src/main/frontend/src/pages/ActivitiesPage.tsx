/**
 * Activities Page
 *
 * List and detail view for swim activities.
 *
 * @module pages/ActivitiesPage
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Waves } from 'lucide-react';

import { GlassCard } from '../components/ui';

/**
 * Activities page component.
 */
export const ActivitiesPage: React.FC = () => {
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
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Waves className="w-16 h-16 text-primary" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {t('nav.activities')}
          </h2>
          <p className="text-muted">Coming soon - Activity list and details</p>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default ActivitiesPage;
