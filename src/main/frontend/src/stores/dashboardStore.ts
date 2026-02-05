/**
 * Dashboard Store
 *
 * Global state for dashboard layout, widgets, and preferences.
 * Supports customizable widget arrangement and 3D feature toggle.
 *
 * @module stores/dashboardStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type WidgetType =
  | 'pace-trend'
  | 'hr-zones'
  | 'stroke-distribution'
  | 'heatmap-calendar'
  | 'community-rank'
  | 'recent-activities'
  | 'efficiency-score'
  | 'fatigue-curve';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  position: { x: number; y: number };
  size: { w: number; h: number };
  visible: boolean;
}

export interface DashboardState {
  /** Widget configurations */
  widgets: DashboardWidget[];
  /** Whether 3D features are enabled (performance toggle) */
  enable3D: boolean;
  /** Animation speed multiplier (0.5 = slow, 1 = normal, 2 = fast) */
  animationSpeed: number;
  /** Celebration effects enabled */
  celebrationEffects: boolean;
  /** Compact mode for mobile */
  compactMode: boolean;

  // Actions
  setWidgets: (widgets: DashboardWidget[]) => void;
  toggleWidget: (id: string) => void;
  updateWidgetPosition: (id: string, position: { x: number; y: number }) => void;
  setEnable3D: (enabled: boolean) => void;
  set3D: (enabled: boolean) => void;
  setAnimationSpeed: (speed: number) => void;
  setCelebrationEffects: (enabled: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  resetToDefaults: () => void;
}

const defaultWidgets: DashboardWidget[] = [
  { id: 'w1', type: 'pace-trend', position: { x: 0, y: 0 }, size: { w: 2, h: 1 }, visible: true },
  { id: 'w2', type: 'hr-zones', position: { x: 2, y: 0 }, size: { w: 1, h: 1 }, visible: true },
  { id: 'w3', type: 'stroke-distribution', position: { x: 3, y: 0 }, size: { w: 1, h: 1 }, visible: true },
  { id: 'w4', type: 'heatmap-calendar', position: { x: 0, y: 1 }, size: { w: 4, h: 1 }, visible: true },
  { id: 'w5', type: 'recent-activities', position: { x: 0, y: 2 }, size: { w: 2, h: 1 }, visible: true },
  { id: 'w6', type: 'efficiency-score', position: { x: 2, y: 2 }, size: { w: 1, h: 1 }, visible: true },
  { id: 'w7', type: 'community-rank', position: { x: 3, y: 2 }, size: { w: 1, h: 1 }, visible: true },
];

/**
 * Zustand store for dashboard configuration.
 */
export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      widgets: defaultWidgets,
      enable3D: false, // Disabled by default for performance
      animationSpeed: 1,
      celebrationEffects: true,
      compactMode: false,

      setWidgets: (widgets) => set({ widgets }),

      toggleWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, visible: !w.visible } : w
          ),
        })),

      updateWidgetPosition: (id, position) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, position } : w
          ),
        })),

      set3D: (enable3D) => set({ enable3D }),

      setEnable3D: (enable3D) => set({ enable3D }),

      setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),

      setCelebrationEffects: (celebrationEffects) => set({ celebrationEffects }),

      setCompactMode: (compactMode) => set({ compactMode }),

      resetToDefaults: () =>
        set({
          widgets: defaultWidgets,
          enable3D: false,
          animationSpeed: 1,
          celebrationEffects: true,
          compactMode: false,
        }),
    }),
    {
      name: 'swim-dashboard',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useDashboardStore;
