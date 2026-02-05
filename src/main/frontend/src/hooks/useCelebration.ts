/**
 * useCelebration Hook
 *
 * Provides celebration effects using canvas-confetti for achievements.
 * Integrates with the dashboard store for feature toggle.
 *
 * @module hooks/useCelebration
 */

import { useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useDashboardStore } from '../stores';

export interface CelebrationOptions {
  /** Celebration type */
  type?: 'confetti' | 'fireworks' | 'stars' | 'swim';
  /** Duration in milliseconds */
  duration?: number;
  /** Intensity (0-1) */
  intensity?: number;
}

/**
 * Hook for triggering celebration effects.
 * Effects are disabled when celebrationEffects is false in store.
 *
 * @returns Object with celebration trigger functions
 *
 * @example
 * ```tsx
 * const { celebrate, celebrateAchievement, celebratePB } = useCelebration();
 *
 * // On achievement
 * celebrateAchievement();
 *
 * // On personal best
 * celebratePB();
 * ```
 */
export function useCelebration() {
  const celebrationEffects = useDashboardStore((s) => s.celebrationEffects);

  /**
   * Base confetti burst.
   */
  const confettiBurst = useCallback(
    (options: confetti.Options = {}) => {
      if (!celebrationEffects) return;

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'],
        ...options,
      });
    },
    [celebrationEffects]
  );

  /**
   * Fireworks effect.
   */
  const fireworks = useCallback(() => {
    if (!celebrationEffects) return;

    const duration = 3000;
    const end = Date.now() + duration;

    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 30,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: Math.random(),
          y: Math.random() * 0.5,
        },
        colors: ['#3b82f6', '#22c55e', '#f59e0b'],
      });
    }, 200);
  }, [celebrationEffects]);

  /**
   * Star shower effect.
   */
  const stars = useCallback(() => {
    if (!celebrationEffects) return;

    const defaults = {
      spread: 360,
      ticks: 100,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      shapes: ['star'] as confetti.Shape[],
      colors: ['#ffd700', '#ffec8b', '#f59e0b'],
    };

    confetti({
      ...defaults,
      particleCount: 40,
      scalar: 1.2,
      origin: { x: 0.5, y: 0.5 },
    });

    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 20,
        scalar: 0.75,
        origin: { x: 0.5, y: 0.5 },
      });
    }, 150);
  }, [celebrationEffects]);

  /**
   * Swimming-themed celebration (blue/water colors).
   */
  const swimCelebration = useCallback(() => {
    if (!celebrationEffects) return;

    // Left side
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#e0f2fe'],
    });

    // Right side
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#e0f2fe'],
    });
  }, [celebrationEffects]);

  /**
   * Celebrate an achievement.
   */
  const celebrateAchievement = useCallback(() => {
    if (!celebrationEffects) return;

    confettiBurst({ particleCount: 150, spread: 100 });

    setTimeout(() => {
      stars();
    }, 500);
  }, [celebrationEffects, confettiBurst, stars]);

  /**
   * Celebrate a personal best.
   */
  const celebratePB = useCallback(() => {
    if (!celebrationEffects) return;

    // Gold burst!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ffd700', '#ffec8b', '#f59e0b', '#fbbf24'],
    });

    setTimeout(fireworks, 300);
  }, [celebrationEffects, fireworks]);

  /**
   * Celebrate import completion.
   */
  const celebrateImport = useCallback(() => {
    if (!celebrationEffects) return;
    swimCelebration();
  }, [celebrationEffects, swimCelebration]);

  /**
   * Main celebration trigger with type selection.
   */
  const celebrate = useCallback(
    (options: CelebrationOptions = {}) => {
      if (!celebrationEffects) return;

      const { type = 'confetti', intensity = 1 } = options;
      const particleCount = Math.round(100 * intensity);

      switch (type) {
        case 'fireworks':
          fireworks();
          break;
        case 'stars':
          stars();
          break;
        case 'swim':
          swimCelebration();
          break;
        case 'confetti':
        default:
          confettiBurst({ particleCount });
          break;
      }
    },
    [celebrationEffects, confettiBurst, fireworks, stars, swimCelebration]
  );

  return {
    celebrate,
    celebrateAchievement,
    celebratePB,
    celebrateImport,
    confettiBurst,
    fireworks,
    stars,
    swimCelebration,
    isEnabled: celebrationEffects,
  };
}

export default useCelebration;
