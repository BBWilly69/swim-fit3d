/**
 * Hooks Module Exports
 *
 * Re-exports all custom hooks for easy importing.
 *
 * @module hooks
 */

export { useGsap } from './useGsap';
export { useCelebration } from './useCelebration';
export type { CelebrationOptions } from './useCelebration';
export { useTheme } from './useTheme';
export type { ThemeId } from './useTheme';
export { useImport } from './useImport';
export type { ImportProgress, ImportResult } from './useImport';
export { useSessionReplay } from './useSessionReplay';
export type {
  StrokeEvent,
  SessionData,
  ReplayState,
  UseSessionReplayOptions,
  UseSessionReplayReturn,
} from './useSessionReplay';
export { useReplayData } from './useReplayData';
export type {
  UseReplayDataOptions,
  UseReplayDataReturn,
} from './useReplayData';
