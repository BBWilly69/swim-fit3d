/**
 * Main Application Component
 *
 * Root component that sets up routing and providers.
 *
 * @module App
 */

import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import './i18n';
import './styles/themes.css';
import { initializeTheme } from './utils/theme';
import { MainLayout } from './components/layout';
import { Dashboard, ImportPage } from './pages';

// Lazy load other pages for code splitting
const ActivitiesPage = React.lazy(() =>
  import('./pages/ActivitiesPage').catch(() => ({ default: PlaceholderPage }))
);
const AnalysisPage = React.lazy(() =>
  import('./pages/AnalysisPage').catch(() => ({ default: PlaceholderPage }))
);
const CommunityPage = React.lazy(() =>
  import('./pages/CommunityPage').catch(() => ({ default: PlaceholderPage }))
);
const SettingsPage = React.lazy(() =>
  import('./pages/SettingsPage').catch(() => ({ default: PlaceholderPage }))
);

// 3D Demo page (lazy loaded)
const SwimmerDemoPage = React.lazy(() =>
  import('./pages/SwimmerDemoPage').catch(() => ({ default: PlaceholderPage }))
);

// 5-Lane Analysis Pool Demo
const AnalysisPoolDemoPage = React.lazy(() =>
  import('./pages/AnalysisPoolDemoPage').catch(() => ({ default: PlaceholderPage }))
);

/** Loading spinner component */
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <motion.div
      className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  </div>
);

/** Placeholder for pages not yet implemented */
const PlaceholderPage: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
    <motion.div
      className="text-6xl mb-4"
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      🏊
    </motion.div>
    <h2 className="text-2xl font-bold text-foreground mb-2">Coming Soon</h2>
    <p className="text-muted">This page is under construction.</p>
  </div>
);

/**
 * Main App component.
 */
export const App: React.FC = () => {
  // Initialize theme on app load
  useEffect(() => {
    initializeTheme();
  }, []);

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="activities" element={<ActivitiesPage />} />
            <Route path="activities/:id" element={<ActivitiesPage />} />
            <Route path="analysis" element={<AnalysisPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="swimmer-demo" element={<SwimmerDemoPage />} />
            <Route path="analysis-pool" element={<AnalysisPoolDemoPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
