/**
 * Import Page
 *
 * Dedicated page for the import wizard.
 *
 * @module pages/ImportPage
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import { ImportWizard } from '../components/import';

/**
 * Import page component.
 */
export const ImportPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      className="max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <ImportWizard onComplete={() => navigate('/')} />
    </motion.div>
  );
};

export default ImportPage;
