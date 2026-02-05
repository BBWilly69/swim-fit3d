/**
 * Activity Store
 *
 * Global state management for swim activities using Zustand.
 * Handles activity list, selected activity, and filtering.
 *
 * @module stores/activityStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SwimActivity, StrokeType } from '../types';

export interface ActivityFilters {
  dateRange: { start: Date | null; end: Date | null };
  strokeTypes: StrokeType[];
  minDistance: number | null;
  maxDistance: number | null;
}

export interface ActivityState {
  /** List of all imported activities */
  activities: SwimActivity[];
  /** Currently selected activity for detail view */
  selectedActivity: SwimActivity | null;
  /** Active filters */
  filters: ActivityFilters;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;

  // Actions
  setActivities: (activities: SwimActivity[]) => void;
  addActivity: (activity: SwimActivity) => void;
  removeActivity: (id: string) => void;
  selectActivity: (activity: SwimActivity | null) => void;
  setFilters: (filters: Partial<ActivityFilters>) => void;
  resetFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const defaultFilters: ActivityFilters = {
  dateRange: { start: null, end: null },
  strokeTypes: [],
  minDistance: null,
  maxDistance: null,
};

/**
 * Zustand store for activity management.
 *
 * @example
 * ```tsx
 * const { activities, selectActivity } = useActivityStore();
 * ```
 */
export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      activities: [],
      selectedActivity: null,
      filters: defaultFilters,
      isLoading: false,
      error: null,

      setActivities: (activities) => set({ activities }),

      addActivity: (activity) =>
        set((state) => ({
          activities: [...state.activities, activity],
        })),

      removeActivity: (id) =>
        set((state) => ({
          activities: state.activities.filter((a) => a.id !== id),
          selectedActivity:
            state.selectedActivity?.id === id ? null : state.selectedActivity,
        })),

      selectActivity: (activity) => set({ selectedActivity: activity }),

      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),

      resetFilters: () => set({ filters: defaultFilters }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),
    }),
    {
      name: 'swim-activities',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activities: state.activities,
        filters: state.filters,
      }),
    }
  )
);

export default useActivityStore;
