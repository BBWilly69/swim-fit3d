/**
 * Stores Index
 *
 * Re-exports all Zustand stores for centralized access.
 *
 * @module stores
 */

export { useActivityStore } from './activityStore';
export type { ActivityState, ActivityFilters } from './activityStore';

export { useDashboardStore } from './dashboardStore';
export type { DashboardState, DashboardWidget, WidgetType } from './dashboardStore';
