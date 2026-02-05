/**
 * Core Type Definitions
 *
 * Contains all TypeScript interfaces and types for the SwimMerge application.
 * These types mirror the backend domain model and provide type safety.
 *
 * @module types
 */

// ============================================================================
// Theme Types
// ============================================================================

/** Available theme identifiers */
export type ThemeId = 'light' | 'dark' | 'pool-blue' | 'gold-medal' | 'blue-matrix' | 'blue-wave';

/** Theme configuration with metadata */
export interface Theme {
  id: ThemeId;
  name: string;
  icon: string;
  description: string;
}

/** Available themes with display information */
export const THEMES: Theme[] = [
  { id: 'light', name: 'Light', icon: '☀️', description: 'Clean and bright' },
  { id: 'dark', name: 'Dark', icon: '🌙', description: 'Easy on the eyes' },
  { id: 'pool-blue', name: 'Pool Blue', icon: '🏊', description: 'Swimming pool vibes' },
  { id: 'gold-medal', name: 'Gold Medal', icon: '🥇', description: 'Champion style' },
  { id: 'blue-matrix', name: 'Blue Matrix', icon: '💎', description: 'Tech futuristic' },
  { id: 'blue-wave', name: 'Blue Wave', icon: '🌊', description: 'Ocean waves' },
];

// ============================================================================
// Activity Types
// ============================================================================

/** Swim stroke type enumeration */
export type StrokeType =
  | 'FREESTYLE'
  | 'BACKSTROKE'
  | 'BREASTSTROKE'
  | 'BUTTERFLY'
  | 'MEDLEY'
  | 'DRILL'
  | 'MIXED';

/** Activity data source */
export type DataSource = 'FORM' | 'GARMIN' | 'MERGED' | 'MANUAL';

/** Pool length in meters */
export type PoolLength = 25 | 50;

/** Single swim length within a lap */
export interface SwimLength {
  id: string;
  lengthIndex: number;
  strokeType: StrokeType;
  strokeCount: number;
  durationMs: number;
  distanceMeters: number;
  avgPace: number; // seconds per 100m
  swolf: number;
}

/** Lap containing multiple lengths */
export interface SwimLap {
  id: string;
  lapIndex: number;
  startTime: string; // ISO 8601
  endTime: string;
  durationMs: number;
  distanceMeters: number;
  strokeType: StrokeType;
  avgStrokeCount: number;
  avgPace: number;
  avgSwolf: number;
  avgHr?: number;
  maxHr?: number;
  lengths: SwimLength[];
}

/** Heart rate sample point */
export interface HrSample {
  timestamp: string; // ISO 8601
  bpm: number;
  zone?: number; // 1-5
}

/** Full swim activity */
export interface SwimActivity {
  id: string;
  source: DataSource;
  startTime: string; // ISO 8601
  endTime: string;
  durationMs: number;
  poolLength: PoolLength;
  totalDistanceMeters: number;
  totalLengths: number;
  totalStrokes: number;
  avgPace: number;
  bestPace: number;
  avgSwolf: number;
  avgHr?: number;
  maxHr?: number;
  calories?: number;
  laps: SwimLap[];
  hrSamples: HrSample[];
  // Metadata
  deviceName?: string;
  notes?: string;
  tags?: string[];
}

/** Activity summary for list views */
export interface ActivitySummary {
  id: string;
  startTime: string;
  durationMs: number;
  distanceMeters: number;
  avgPace: number;
  avgSwolf: number;
  lapCount: number;
  source: DataSource;
}

// ============================================================================
// Import Types
// ============================================================================

/** Import event type from SSE stream */
export type ImportEventType =
  | 'STARTED'
  | 'FILE_PROCESSING'
  | 'FILE_COMPLETED'
  | 'FILE_SKIPPED'
  | 'FILE_ERROR'
  | 'COMPLETED'
  | 'ERROR';

/** Single import event from SSE */
export interface ImportEvent {
  type: ImportEventType;
  timestamp: string;
  fileName?: string;
  message?: string;
  progress?: number; // 0-100
  currentFile?: number;
  totalFiles?: number;
  // Result counts
  activitiesImported?: number;
  lapsImported?: number;
  lengthsImported?: number;
  hrSamplesImported?: number;
  filesSkipped?: number;
  errors?: string[];
}

/** Aggregated import progress state */
export interface ImportProgress {
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number; // 0-100
  currentFile: number;
  totalFiles: number;
  currentFileName?: string;
  eta?: number; // milliseconds
  startTime?: number; // timestamp
  // Counters
  successCount: number;
  skippedCount: number;
  errorCount: number;
  // Results
  activitiesImported: number;
  lapsImported: number;
  lengthsImported: number;
  hrSamplesImported: number;
  errors: string[];
}

/** Import history entry for ETA calculation */
export interface ImportHistoryEntry {
  timestamp: number;
  fileCount: number;
  totalDurationMs: number;
  avgFileProcessingMs: number;
}

// ============================================================================
// Statistics Types
// ============================================================================

/** Aggregated statistics for a time period */
export interface PeriodStats {
  period: 'week' | 'month' | 'year' | 'all';
  startDate: string;
  endDate: string;
  totalDistance: number;
  totalTime: number;
  sessionCount: number;
  avgPace: number;
  bestPace: number;
  avgSwolf: number;
  bestSwolf: number;
  totalStrokes: number;
  avgHr?: number;
  // By stroke
  distanceByStroke: Record<StrokeType, number>;
  timeByStroke: Record<StrokeType, number>;
}

/** Personal best record */
export interface PersonalBest {
  category: string; // e.g., "100m Freestyle"
  value: number;
  unit: string;
  date: string;
  activityId: string;
}

// ============================================================================
// Community Types
// ============================================================================

/** Community percentile data point */
export interface PercentileData {
  percentile: number; // 1-100
  value: number;
}

/** Community comparison data */
export interface CommunityComparison {
  metric: string;
  yourValue: number;
  percentile: number;
  percentileData: PercentileData[];
  dataSource: string;
  sampleSize: number;
  lastUpdated: string;
}

/** Community statistics by stroke and distance */
export interface CommunityStats {
  stroke: StrokeType;
  distance: number;
  ageGroup: string;
  gender: 'M' | 'F' | 'ALL';
  percentiles: Record<number, number>; // percentile -> pace in sec/100m
  dataSource: string;
  sampleSize: number;
}

// ============================================================================
// Chart Types
// ============================================================================

/** Data point for time series charts */
export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

/** Lane visualization data */
export interface LaneData {
  lapIndex: number;
  lengths: {
    index: number;
    stroke: StrokeType;
    direction: 'down' | 'up';
    pace: number;
    hr?: number;
    swolf: number;
  }[];
}

/** HR zone definition */
export interface HrZone {
  zone: number;
  name: string;
  minBpm: number;
  maxBpm: number;
  color: string;
  timeInZone: number; // milliseconds
  percentage: number;
}

// ============================================================================
// UI Types
// ============================================================================

/** Modal state */
export interface ModalState {
  isOpen: boolean;
  title?: string;
  content?: React.ReactNode;
}

/** Toast notification */
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

/** Tab definition */
export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

/** Filter option */
export interface FilterOption<T = string> {
  value: T;
  label: string;
  count?: number;
}

// ============================================================================
// API Types
// ============================================================================

/** Paginated response wrapper */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** API error response */
export interface ApiError {
  status: number;
  message: string;
  timestamp: string;
  path?: string;
  details?: Record<string, string>;
}
