/**
 * API Service
 *
 * Handles all HTTP communication with the backend API.
 * Provides typed methods for all endpoints.
 *
 * @module services/api
 */

import type {
  SwimActivity,
  ActivitySummary,
  Page,
  ApiError,
  PeriodStats,
} from '../types';

/** Base API URL - defaults to relative path for same-origin deployment */
const API_BASE = '/api/v1';

/**
 * Custom error class for API errors.
 */
export class ApiException extends Error {
  status: number;
  statusText: string;
  body?: ApiError;

  constructor(status: number, statusText: string, body?: ApiError) {
    super(body?.message ?? statusText);
    this.name = 'ApiException';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

/**
 * Generic fetch wrapper with error handling and typing.
 *
 * @param endpoint - API endpoint path
 * @param options - Fetch options
 * @returns Parsed JSON response
 * @throws ApiException on error responses
 */
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let body: ApiError | undefined;
    try {
      body = await response.json();
    } catch {
      // Ignore JSON parse errors
    }
    throw new ApiException(response.status, response.statusText, body);
  }

  // Handle empty responses
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ============================================================================
// Activities API
// ============================================================================

/**
 * Fetches a paginated list of activity summaries.
 *
 * @param page - Page number (0-indexed)
 * @param size - Page size
 * @returns Paginated activity summaries
 */
export async function getActivities(
  page = 0,
  size = 20
): Promise<Page<ActivitySummary>> {
  return fetchApi(`/activities?page=${page}&size=${size}`);
}

/**
 * Fetches a single activity by ID with full details.
 *
 * @param id - Activity ID
 * @returns Full activity with laps and lengths
 */
export async function getActivity(id: string): Promise<SwimActivity> {
  return fetchApi(`/activities/${id}`);
}

/**
 * Deletes an activity.
 *
 * @param id - Activity ID to delete
 */
export async function deleteActivity(id: string): Promise<void> {
  return fetchApi(`/activities/${id}`, { method: 'DELETE' });
}

// ============================================================================
// Statistics API
// ============================================================================

/**
 * Fetches aggregated statistics for a time period.
 *
 * @param period - Time period ('week' | 'month' | 'year' | 'all')
 * @returns Aggregated statistics
 */
export async function getStats(
  period: 'week' | 'month' | 'year' | 'all' = 'week'
): Promise<PeriodStats> {
  return fetchApi(`/stats/${period}`);
}

// ============================================================================
// Import API
// ============================================================================

/**
 * Uploads a ZIP file for import and returns an SSE stream URL.
 *
 * @param file - ZIP file to upload
 * @returns SSE stream URL for progress updates
 */
export async function uploadImportFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/import/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let body: ApiError | undefined;
    try {
      body = await response.json();
    } catch {
      // Ignore
    }
    throw new ApiException(response.status, response.statusText, body);
  }

  const { streamUrl } = await response.json();
  return streamUrl;
}

/**
 * Creates an EventSource for import progress updates.
 *
 * @param streamUrl - SSE stream URL from upload response
 * @returns EventSource instance
 */
export function createImportStream(streamUrl: string): EventSource {
  return new EventSource(`${API_BASE}${streamUrl}`);
}

// ============================================================================
// Health API
// ============================================================================

/**
 * Checks backend health status.
 *
 * @returns Health status
 */
export async function checkHealth(): Promise<{ status: string }> {
  return fetchApi('/actuator/health');
}

// ============================================================================
// Session Replay API
// ============================================================================

/**
 * Stroke type enum matching backend.
 */
export type StrokeType =
  | 'FREESTYLE'
  | 'BACKSTROKE'
  | 'BREASTSTROKE'
  | 'BUTTERFLY'
  | 'IM'
  | 'DRILL'
  | 'KICK'
  | 'REST';

/**
 * Individual stroke event for 3D animation.
 */
export interface StrokeEventDto {
  timestampMs: number;
  positionX: number;
  positionY: number;
  strokeType: StrokeType;
  strokePhase: number;
  heartRate?: number;
  velocity?: number;
  lengthIndex: number;
}

/**
 * Length marker for timeline.
 */
export interface LengthMarkerDto {
  lengthIndex: number;
  startTimestampMs: number;
  endTimestampMs: number;
  distanceMeters: number;
  strokeCount?: number;
  paceSeconds: number;
}

/**
 * Lap marker for timeline.
 */
export interface LapMarkerDto {
  lapIndex: number;
  startTimestampMs: number;
  endTimestampMs: number;
  distanceMeters: number;
  lengthStartIndex: number;
  lengthEndIndex: number;
  label: string;
}

/**
 * Complete session replay data for 3D visualization.
 */
export interface SessionReplayDto {
  activityId: string;
  totalDurationMs: number;
  poolLengthMeters: number;
  laneCount: number;
  events: StrokeEventDto[];
  lengthMarkers: LengthMarkerDto[];
  lapMarkers: LapMarkerDto[];
}

/**
 * Fetches session replay data for a specific activity.
 *
 * @param activityId - UUID of the activity
 * @returns Session replay data for 3D visualization
 */
export async function getSessionReplay(activityId: string): Promise<SessionReplayDto> {
  // Use /api/replay endpoint (not /api/v1)
  const response = await fetch(`/api/replay/${activityId}`);
  if (!response.ok) {
    throw new ApiException(response.status, response.statusText);
  }
  return response.json();
}

/**
 * Fetches demo session replay data for testing.
 *
 * @param durationMinutes - Session duration (default: 30)
 * @param poolLength - Pool length in meters (default: 25)
 * @returns Demo replay data
 */
export async function getDemoSessionReplay(
  durationMinutes = 30,
  poolLength = 25
): Promise<SessionReplayDto> {
  const response = await fetch(
    `/api/replay/demo?duration=${durationMinutes}&poolLength=${poolLength}`
  );
  if (!response.ok) {
    throw new ApiException(response.status, response.statusText);
  }
  return response.json();
}

/**
 * Lists available activities with replay data.
 *
 * @returns List of activity IDs
 */
export async function getReplayActivities(): Promise<{ activityIds: string[]; count: number }> {
  const response = await fetch('/api/replay/activities');
  if (!response.ok) {
    throw new ApiException(response.status, response.statusText);
  }
  return response.json();
}
