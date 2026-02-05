/**
 * MainLayout Component
 *
 * Main application layout with sidebar and content area.
 *
 * @module components/layout/MainLayout
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import clsx from 'clsx';

import { Sidebar } from './Sidebar';

export interface MainLayoutProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * MainLayout component wrapping the entire application.
 *
 * @example
 * ```tsx
 * <MainLayout>
 *   <Routes>...</Routes>
 * </MainLayout>
 * ```
 */
export const MainLayout: React.FC<MainLayoutProps> = ({ className }) => {
  return (
    <div className={clsx('flex min-h-screen bg-background', className)}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="ml-64 min-h-screen transition-all duration-300 flex items-start">
        <motion.div
          className="p-6 md:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Gradient orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default MainLayout;
