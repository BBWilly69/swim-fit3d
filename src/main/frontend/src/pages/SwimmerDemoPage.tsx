/**
 * SwimmerDemoPage
 *
 * Demo page for testing the SimpleLaneSwimmer component with the
 * swimming_animations_pack.glb model.
 *
 * Access via: /swimmer-demo
 *
 * @module pages/SwimmerDemoPage
 */

import React from 'react';
import { SimpleLaneDemo } from '../components/3d';

/**
 * Demo page wrapper component.
 */
export const SwimmerDemoPage: React.FC = () => {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          🏊 Swimmer Animation Demo
        </h1>
        <p className="text-muted">
          Test der <code className="bg-muted px-1 rounded">swimming_animations_pack.glb</code>{' '}
          ohne Rotationsänderungen. Der Schwimmer schwimmt eine Bahn (x=0 → x=25m).
        </p>
        <div className="mt-2 text-sm text-muted">
          <strong>FIT-Daten:</strong> 21682457269_ACTIVITY.fit (25m Pool, 2 Lengths, Freestyle)
        </div>
      </div>

      {/* 3D Demo */}
      <div className="bg-card rounded-xl overflow-hidden shadow-lg border border-border">
        <SimpleLaneDemo
          poolLength={25}
          height={600}
          debug={true}
        />
      </div>

      {/* Info */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Controls info */}
        <div className="bg-card rounded-lg p-4 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-2">🎮 Steuerung</h2>
          <ul className="text-sm text-muted space-y-1">
            <li>• <strong>Linke Maustaste + Ziehen:</strong> Kamera drehen</li>
            <li>• <strong>Rechte Maustaste + Ziehen:</strong> Kamera verschieben</li>
            <li>• <strong>Mausrad:</strong> Zoom</li>
            <li>• <strong>Play/Pause:</strong> Animation starten/stoppen</li>
            <li>• <strong>Length:</strong> FIT-Daten für diese Bahn</li>
            <li>• <strong>Speed:</strong> Wiedergabegeschwindigkeit</li>
          </ul>
        </div>

        {/* Model info */}
        <div className="bg-card rounded-lg p-4 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-2">📦 Modell-Info</h2>
          <ul className="text-sm text-muted space-y-1">
            <li>• <strong>GLB:</strong> swimming_animations_pack.glb</li>
            <li>• <strong>Rotation:</strong> Keine (1:1 wie exportiert)</li>
            <li>• <strong>Animationen:</strong> Freestyle, SwimBreastStroke, SwimBackStroke, SwimButterfly, SwimIdle</li>
            <li>• <strong>Speed-Berechnung:</strong> Aus FIT Cadence/Strokes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SwimmerDemoPage;
