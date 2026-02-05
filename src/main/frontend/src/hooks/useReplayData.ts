/**
 * useReplayData Hook
 *
 * Fetches session replay data from the backend API
 * and converts it to the format expected by useSessionReplay.
 *
 * @module hooks/useReplayData
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getDemoSessionReplay,
  getSessionReplay,
  type SessionReplayDto,
} from '../services/api';
import type { SessionData, StrokeEvent, LengthMarker } from './useSessionReplay';

/**
 * Converts API StrokeType to frontend strokeType
 */
const mapStrokeType = (apiType: string): StrokeEvent['strokeType'] => {
  switch (apiType) {
    case 'BACKSTROKE':
      return 'backstroke';
    case 'BREASTSTROKE':
      return 'breaststroke';
    case 'BUTTERFLY':
      return 'butterfly';
    case 'FREESTYLE':
    default:
      return 'freestyle';
  }
};

/**
 * Converts API response to SessionData format.
 */
const convertToSessionData = (dto: SessionReplayDto): SessionData => {
  // Convert stroke events
  const events: StrokeEvent[] = dto.events.map((e) => {
    const length = dto.lengthMarkers.find((l) => l.lengthIndex === e.lengthIndex);
    const strokeInLength = Math.floor((e.strokePhase * (length?.strokeCount ?? 15)) + 1);

    return {
      timestamp: e.timestampMs,
      lane: e.lengthIndex + 1,
      strokeNumber: strokeInLength,
      strokeType: mapStrokeType(e.strokeType),
      strokePhase: e.strokePhase,
      strokeRate: e.velocity ? Math.round((e.velocity / dto.poolLengthMeters) * 60 * 15) : 30,
      distance: e.positionX * dto.poolLengthMeters,
      totalDistance: e.lengthIndex * dto.poolLengthMeters + e.positionX * dto.poolLengthMeters,
      pace: length?.paceSeconds ?? 100,
      heartRate: e.heartRate ?? undefined,
      swolf: length?.strokeCount ? Math.round(length.paceSeconds + (length.strokeCount ?? 0)) : undefined,
      isTurn: e.positionX >= 0.95 || e.positionX <= 0.05,
      poolPosition: e.positionX,
    };
  });

  const lengthMarkers: LengthMarker[] = dto.lengthMarkers.map((marker) => ({
    lengthIndex: marker.lengthIndex,
    startTimestampMs: marker.startTimestampMs,
    endTimestampMs: marker.endTimestampMs,
    distanceMeters: marker.distanceMeters,
    strokeCount: marker.strokeCount,
    paceSeconds: marker.paceSeconds,
  }));

  return {
    id: dto.activityId,
    startTime: new Date(),
    duration: dto.totalDurationMs,
    poolLength: dto.poolLengthMeters as 25 | 50,
    events,
    lengthMarkers,
    totalLengths: dto.lengthMarkers.length,
    totalStrokes: dto.events.length,
  };
};

export interface UseReplayDataOptions {
  /** Activity ID to fetch (null for demo data) */
  activityId?: string | null;
  /** Duration for demo session in minutes */
  demoDuration?: number;
  /** Pool length for demo session */
  demoPoolLength?: 25 | 50;
  /** Use local mock demo instead of backend */
  useMockDemo?: boolean;
  /** Whether to auto-fetch on mount */
  autoFetch?: boolean;
}

export interface UseReplayDataReturn {
  /** Session data (null while loading or on error) */
  sessionData: SessionData | null;
  /** Raw API response */
  rawData: SessionReplayDto | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message (if any) */
  error: string | null;
  /** Whether using demo data */
  isDemo: boolean;
  /** Fetch/reload data */
  refetch: () => Promise<void>;
  /** Clear data */
  clear: () => void;
}

/**
 * Hook for fetching and managing session replay data.
 *
 * @param options - Configuration options
 * @returns Replay data state and controls
 */
export function useReplayData(options: UseReplayDataOptions = {}): UseReplayDataReturn {
  const {
    activityId = null,
    demoDuration = 30,
    demoPoolLength = 25,
    useMockDemo = false,
    autoFetch = true,
  } = options;

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [rawData, setRawData] = useState<SessionReplayDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(!activityId);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let response: SessionReplayDto;

      if (activityId) {
        // Fetch real activity data
        response = await getSessionReplay(activityId);
        setIsDemo(false);
      } else if (useMockDemo) {
        const mockData = generateExampleSessionData();
        setSessionData(mockData);
        setRawData(null);
        setIsDemo(true);
        return;
      } else {
        // Fetch demo data
        response = await getDemoSessionReplay(demoDuration, demoPoolLength);
        setIsDemo(true);
      }

      setRawData(response);
      setSessionData(convertToSessionData(response));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch replay data';
      setError(message);
      console.error('Failed to fetch replay data:', err);

      // Fall back to mock data on error
      console.info('Falling back to mock session data');
      const mockData = generateMockSessionData(demoDuration, demoPoolLength);
      setSessionData(mockData);
      setIsDemo(true);
    } finally {
      setIsLoading(false);
    }
  }, [activityId, demoDuration, demoPoolLength, useMockDemo]);

  const clear = useCallback(() => {
    setSessionData(null);
    setRawData(null);
    setError(null);
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  return {
    sessionData,
    rawData,
    isLoading,
    error,
    isDemo,
    refetch: fetchData,
    clear,
  };
}

/**
 * Generate mock session data as fallback.
 */
function generateExampleSessionData(): SessionData {
  const poolLength: 25 | 50 = 25;
  const lapDurationsMs = [26_500, 27_200];
  const strokesPerLength = 11;
  const totalLengths = lapDurationsMs.length;
  const totalStrokes = totalLengths * strokesPerLength;
  const totalDurationMs = lapDurationsMs.reduce((sum, ms) => sum + ms, 0);

  const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);

  const events: StrokeEvent[] = [];
  const lengthMarkers: LengthMarker[] = [];

  let accumulatedMs = 0;
  for (let lengthIndex = 0; lengthIndex < totalLengths; lengthIndex++) {
    const lengthDurationMs = lapDurationsMs[lengthIndex];
    const paceSeconds = Math.round((lengthDurationMs / 1000) * (100 / poolLength));

    lengthMarkers.push({
      lengthIndex,
      startTimestampMs: accumulatedMs,
      endTimestampMs: accumulatedMs + lengthDurationMs,
      distanceMeters: poolLength,
      strokeCount: strokesPerLength,
      paceSeconds,
    });

    for (let strokeInLength = 1; strokeInLength <= strokesPerLength; strokeInLength++) {
      const progress = strokeInLength / strokesPerLength;
      const strokePhase = (strokeInLength - 1) / Math.max(1, strokesPerLength - 1);
      const isForward = lengthIndex % 2 === 0;
      const easedProgress = easeOutQuad(progress);
      const timestamp = accumulatedMs + progress * lengthDurationMs;
      const distance = easedProgress * poolLength;
      const totalDistance = lengthIndex * poolLength + distance;

      events.push({
        timestamp,
        lane: lengthIndex + 1,
        strokeNumber: strokeInLength,
        strokeType: 'breaststroke',
        strokePhase,
        strokeRate: Math.round((strokesPerLength / (lengthDurationMs / 1000)) * 60),
        distance,
        totalDistance,
        pace: paceSeconds,
        heartRate: 142 + (lengthIndex * 2),
        swolf: paceSeconds + strokesPerLength,
        isTurn: strokeInLength === strokesPerLength,
        poolPosition: isForward ? easedProgress : 1 - easedProgress,
      });
    }

    accumulatedMs += lengthDurationMs;
  }

  return {
    id: `example-session-${Date.now()}`,
    startTime: new Date(),
    duration: totalDurationMs,
    poolLength,
    events,
    lengthMarkers,
    totalLengths,
    totalStrokes,
  };
}

function generateMockSessionData(durationMinutes = 30, poolLength: 25 | 50 = 25): SessionData {
  const totalLengths = Math.floor((durationMinutes * 60) / (poolLength === 25 ? 22 : 45));
  const strokesPerLength = poolLength === 25 ? 15 : 30;
  const totalStrokes = totalLengths * strokesPerLength;

  const events: StrokeEvent[] = [];
  const lengthMarkers: LengthMarker[] = [];
  const totalDurationMs = durationMinutes * 60 * 1000;
  const lengthDurationMs = totalLengths > 0 ? totalDurationMs / totalLengths : totalDurationMs;
  for (let i = 0; i < totalStrokes; i++) {
    const lengthIndex = Math.floor(i / strokesPerLength);
    const strokeInLength = (i % strokesPerLength) + 1;
    const progress = strokeInLength / strokesPerLength;
    const strokePhase = (strokeInLength - 1) / Math.max(1, strokesPerLength - 1);
    const isForward = lengthIndex % 2 === 0;

    events.push({
      timestamp: (i / totalStrokes) * durationMinutes * 60 * 1000,
      lane: lengthIndex + 1,
      strokeNumber: strokeInLength,
      strokeType: 'freestyle',
      strokePhase,
      strokeRate: 28 + Math.random() * 8,
      distance: progress * poolLength,
      totalDistance: lengthIndex * poolLength + progress * poolLength,
      pace: 95 + Math.random() * 15,
      heartRate: 140 + Math.random() * 30,
      swolf: 38 + Math.random() * 10,
      isTurn: strokeInLength === strokesPerLength,
      poolPosition: isForward ? progress : 1 - progress,
    });
  }

  for (let lengthIndex = 0; lengthIndex < totalLengths; lengthIndex++) {
    const startTimestampMs = Math.round(lengthIndex * lengthDurationMs);
    const endTimestampMs = Math.round((lengthIndex + 1) * lengthDurationMs);
    const paceSeconds = Math.round((lengthDurationMs / 1000) * (100 / poolLength));
    lengthMarkers.push({
      lengthIndex,
      startTimestampMs,
      endTimestampMs,
      distanceMeters: poolLength,
      strokeCount: strokesPerLength,
      paceSeconds,
    });
  }

  return {
    id: `mock-session-${Date.now()}`,
    startTime: new Date(),
    duration: totalDurationMs,
    poolLength,
    events,
    lengthMarkers,
    totalLengths,
    totalStrokes,
  };
}

export default useReplayData;
