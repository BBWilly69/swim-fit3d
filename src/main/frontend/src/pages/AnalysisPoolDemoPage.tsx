/**
 * Analysis Pool Demo Page
 *
 * Showcases the professional 5-lane AnalysisPool3D component with
 * swimming hall environment, lane ropes, spectator stands, and timing display.
 *
 * @module pages/AnalysisPoolDemoPage
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { AnalysisPool3D } from '../components/3d';

/**
 * Demo page for the professional 5-lane analysis pool.
 *
 * Features demonstrated:
 * - 5 competition lanes with lane ropes and markers
 * - Swimming hall with windows, spectator stands, timing display
 * - Multi-swimmer support with individual water effects
 * - Starting blocks and touch pads
 */
export const AnalysisPoolDemoPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            {t('demo.analysisPool.title', '5-Lane Analysis Pool')}
          </h1>
          <p className="text-muted mt-2">
            {t('demo.analysisPool.subtitle', 'Professional swimming pool visualization with race analysis features')}
          </p>
        </div>

        {/* Pool visualization */}
        <div className="rounded-xl overflow-hidden shadow-xl border border-border">
          <AnalysisPool3D
            poolLength={25}
            height={700}
            debug={true}
          />
        </div>

        {/* Feature info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg p-4 border border-border">
            <h3 className="font-semibold text-foreground mb-2">🏊 5 Wettkampfbahnen</h3>
            <p className="text-sm text-muted">
              FINA-konforme 2.5m breite Bahnen mit Bahnleinen, Mittelboje und 5m-Markierung.
            </p>
          </div>
          <div className="bg-card rounded-lg p-4 border border-border">
            <h3 className="font-semibold text-foreground mb-2">🏟️ Schwimmhalle</h3>
            <p className="text-sm text-muted">
              Realistische Umgebung mit Fenstern, Zuschauertribüne und Zeitmessanzeige.
            </p>
          </div>
          <div className="bg-card rounded-lg p-4 border border-border">
            <h3 className="font-semibold text-foreground mb-2">💧 Wassereffekte</h3>
            <p className="text-sm text-muted">
              Shader-basierte Wellenbildung, Bugwellen und Splash-Partikel für jeden Schwimmer.
            </p>
          </div>
        </div>

        {/* Controls help */}
        <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">🎮 Steuerung</h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• <strong>Linke Maustaste + Ziehen:</strong> Kamera rotieren</li>
            <li>• <strong>Rechte Maustaste + Ziehen:</strong> Kamera verschieben</li>
            <li>• <strong>Mausrad:</strong> Zoom</li>
            <li>• <strong>Timeline:</strong> Position im Rennen scrubben</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPoolDemoPage;
