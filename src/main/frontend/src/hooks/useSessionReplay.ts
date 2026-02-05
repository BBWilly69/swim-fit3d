/**
 * useSessionReplay Hook
 *
 * Manages session replay state for stroke-by-stroke playback.
 * Supports variable playback speed, seeking, and sync with 3D visualization.
 *
 * @module hooks/useSessionReplay
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface StrokeEvent {
  /** Timestamp in milliseconds from session start */
  timestamp: number;
  /** Lane/length number */
  lane: number;
  /** Stroke count in this length */
  strokeNumber: number;
  /** Stroke type */
  strokeType: 'freestyle' | 'breaststroke' | 'backstroke' | 'butterfly';
  /** Stroke phase (0-1) for animation */
  strokePhase?: number;
  /** Stroke rate (strokes per minute) */
  strokeRate: number;
  /** Distance covered */
  distance: number;
  /** Cumulative distance */
  totalDistance: number;
  /** Current pace (seconds per 100m) */
  pace: number;
  /** Heart rate at this point */
  heartRate?: number;
  /** SWOLF score */
  swolf?: number;
  /** Is this a turn/flip event */
  isTurn: boolean;
  /** Position in pool (0-1) */
  poolPosition: number;
}

export interface LengthMarker {
  /** Length index (0-based) */
  lengthIndex: number;
  /** Length start time in milliseconds */
  startTimestampMs: number;
  /** Length end time in milliseconds */
  endTimestampMs: number;
  /** Distance for this length in meters */
  distanceMeters: number;
  /** Stroke count for this length */
  strokeCount?: number;
  /** Pace per 100m in seconds */
  paceSeconds: number;
}

export interface SessionData {
  /** Session ID */
  id: string;
  /** Session start time */
  startTime: Date;
  /** Total duration in milliseconds */
  duration: number;
  /** Pool length in meters */
  poolLength: 25 | 50;
  /** All stroke events */
  events: StrokeEvent[];
  /** Length markers for timeline */
  lengthMarkers: LengthMarker[];
  /** Total lengths completed */
  totalLengths: number;
  /** Total strokes */
  totalStrokes: number;
}

export interface ReplayState {
  /** Current playback time in milliseconds */
  currentTime: number;
  /** Is playing */
  isPlaying: boolean;
  /** Playback speed multiplier */
  playbackSpeed: number;
  /** Current stroke event index */
  currentEventIndex: number;
  /** Current stroke event */
  currentEvent: StrokeEvent | null;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current pool position (0-1) */
  poolPosition: number;
  /** Current length number */
  currentLength: number;
  /** Current stroke in length */
  currentStroke: number;
  /** Whether swimmer is on starting block (before race starts) */
  isOnBlock: boolean;
  /** Dive phase: 0 = not diving, 0-0.3 = diving, 0.3-1 = gliding */
  divePhase: number;
  /** Turn phase: 0 = not turning, 0-1 = turn animation progress */
  turnPhase: number;
  /** Whether swimmer is currently turning */
  isTurning: boolean;
}

export interface UseSessionReplayOptions {
  /** Session data to replay */
  session: SessionData | null;
  /** Auto-start on mount */
  autoStart?: boolean;
  /** Loop playback */
  loop?: boolean;
  /** Callback when reaching a stroke event */
  onStrokeEvent?: (event: StrokeEvent) => void;
  /** Callback when playback completes */
  onComplete?: () => void;
  /** Callback when length changes */
  onLengthChange?: (length: number) => void;
}

export interface UseSessionReplayReturn {
  /** Current replay state */
  state: ReplayState;
  /** Start/resume playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Toggle play/pause */
  toggle: () => void;
  /** Stop and reset to beginning */
  stop: () => void;
  /** Seek to specific time (ms) */
  seekTo: (time: number) => void;
  /** Seek to specific event index */
  seekToEvent: (index: number) => void;
  /** Seek to specific length */
  seekToLength: (length: number) => void;
  /** Set playback speed */
  setSpeed: (speed: number) => void;
  /** Step forward one event */
  stepForward: () => void;
  /** Step backward one event */
  stepBackward: () => void;
  /** Skip to next length */
  nextLength: () => void;
  /** Skip to previous length */
  previousLength: () => void;
  /** Available playback speeds */
  availableSpeeds: number[];
  /** Is at the end */
  isAtEnd: boolean;
  /** Is at the start */
  isAtStart: boolean;
}

/**
 * Hook for managing session replay with stroke-by-stroke playback.
 *
 * @param options - Configuration options
 * @returns Replay controls and state
 *
 * @example
 * ```tsx
 * const { state, play, pause, seekTo, setSpeed } = useSessionReplay({
 *   session: swimSession,
 *   onStrokeEvent: (event) => console.log('Stroke:', event),
 *   loop: true,
 * });
 *
 * return (
 *   <div>
 *     <button onClick={play}>Play</button>
 *     <span>Length: {state.currentLength}</span>
 *     <span>Stroke: {state.currentStroke}</span>
 *   </div>
 * );
 * ```
 */
export function useSessionReplay(
  options: UseSessionReplayOptions
): UseSessionReplayReturn {
  const {
    session,
    autoStart = false,
    loop = false,
    onStrokeEvent,
    onComplete,
    onLengthChange,
  } = options;

  const availableSpeeds = [0.25, 0.5, 0.75, 1, 1.5, 2, 4, 8];

  const [state, setState] = useState<ReplayState>({
    currentTime: 0,
    isPlaying: false,
    playbackSpeed: 2,
    currentEventIndex: 0,
    currentEvent: null,
    progress: 0,
    poolPosition: 0,
    currentLength: 0,
    currentStroke: 0,
    isOnBlock: true,
    divePhase: 0,
    turnPhase: 0,
    isTurning: false,
  });

  const stateRef = useRef<ReplayState>(state);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const previousLengthRef = useRef<number>(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /**
   * Find the current event based on time.
   */
  const findCurrentEvent = useCallback(
    (time: number): { index: number; event: StrokeEvent | null } => {
      if (!session || session.events.length === 0) {
        return { index: 0, event: null };
      }

      // Binary search for the current event
      let left = 0;
      let right = session.events.length - 1;
      let result = 0;

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (session.events[mid].timestamp <= time) {
          result = mid;
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }

      return {
        index: result,
        event: session.events[result],
      };
    },
    [session]
  );

  /**
   * Update state based on current time.
   */
  const updateStateForTime = useCallback(
    (time: number) => {
      if (!session) return;

      const clampedTime = Math.max(0, Math.min(time, session.duration));
      const { index, event } = findCurrentEvent(clampedTime);
      const nextEvent = session.events[index + 1] ?? null;

      // Calculate dive phase for length 1
      // Dive duration: approximately 2 seconds (2000ms)
      // Glide duration: until first stroke event
      const diveDuration = 2000; // 2 seconds for the dive
      const firstEvent = session.events[0];
      const firstStrokeTime = firstEvent?.timestamp ?? diveDuration;
      
      let isOnBlock = false;
      let divePhase = 0;
      
      if (clampedTime === 0 && !stateRef.current.isPlaying) {
        // Before play: on starting block
        isOnBlock = true;
        divePhase = 0;
      } else if (clampedTime < diveDuration) {
        // Diving phase (0 to 0.3)
        isOnBlock = false;
        divePhase = (clampedTime / diveDuration) * 0.3;
      } else if (clampedTime < firstStrokeTime) {
        // Gliding phase (0.3 to 1)
        isOnBlock = false;
        const glideProgress = (clampedTime - diveDuration) / (firstStrokeTime - diveDuration);
        divePhase = 0.3 + glideProgress * 0.7;
      } else {
        // Normal swimming
        isOnBlock = false;
        divePhase = 1;
      }

      let interpolatedPoolPosition = event?.poolPosition ?? 0;
      if (event && nextEvent && nextEvent.timestamp > event.timestamp) {
        const segmentDuration = nextEvent.timestamp - event.timestamp;
        const segmentProgress = (clampedTime - event.timestamp) / segmentDuration;
        const clampedProgress = Math.max(0, Math.min(1, segmentProgress));
        interpolatedPoolPosition =
          event.poolPosition + (nextEvent.poolPosition - event.poolPosition) * clampedProgress;
      }

      // Calculate turn phase - detect when swimmer is at the end of a length
      // Turn happens when poolPosition approaches 1 (end of length) and length changes
      let turnPhase = 0;
      let isTurning = false;
      
      const currentLengthNum = event?.lane ?? 1;
      const turnDuration = 1500; // 1.5 seconds for turn animation
      
      // Find the length marker for current length
      const currentLengthMarker = session.lengthMarkers.find(
        (m) => m.lengthIndex === currentLengthNum - 1
      );
      
      if (currentLengthMarker && currentLengthMarker.endTimestampMs > 0) {
        const turnStartTime = currentLengthMarker.endTimestampMs - turnDuration / 2;
        const turnEndTime = currentLengthMarker.endTimestampMs + turnDuration / 2;
        
        if (clampedTime >= turnStartTime && clampedTime <= turnEndTime) {
          isTurning = true;
          turnPhase = (clampedTime - turnStartTime) / turnDuration;
        }
      }

      const newLength = event?.lane ?? 1;
      if (newLength !== previousLengthRef.current) {
        onLengthChange?.(newLength);
        previousLengthRef.current = newLength;
      }

      if (event && event !== state.currentEvent) {
        onStrokeEvent?.(event);
      }

      setState((prev) => ({
        ...prev,
        currentTime: clampedTime,
        currentEventIndex: index,
        currentEvent: event,
        progress: (clampedTime / session.duration) * 100,
        poolPosition: interpolatedPoolPosition,
        currentLength: event?.lane ?? 1,
        currentStroke: event?.strokeNumber ?? 0,
        isOnBlock,
        divePhase,
        turnPhase,
        isTurning,
      }));
    },
    [session, findCurrentEvent, onStrokeEvent, onLengthChange, state.currentEvent]
  );

  /**
   * Animation loop.
   */
  const tick = useCallback(
    (timestamp: number) => {
      if (!session) return;

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = (timestamp - lastTimeRef.current) * stateRef.current.playbackSpeed;
      lastTimeRef.current = timestamp;

      const newTime = stateRef.current.currentTime + deltaTime;

      if (newTime >= session.duration) {
        if (loop) {
          updateStateForTime(0);
          animationFrameRef.current = requestAnimationFrame(tick);
        } else {
          updateStateForTime(session.duration);
          setState((prev) => ({ ...prev, isPlaying: false }));
          onComplete?.();
        }
        return;
      }

      updateStateForTime(newTime);
      animationFrameRef.current = requestAnimationFrame(tick);
    },
    [session, loop, updateStateForTime, onComplete]
  );

  /**
   * Start playback.
   */
  const play = useCallback(() => {
    if (!session || stateRef.current.isPlaying) return;

    setState((prev) => ({ ...prev, isPlaying: true }));
    lastTimeRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(tick);
  }, [session, tick]);

  /**
   * Pause playback.
   */
  const pause = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  /**
   * Toggle play/pause.
   */
  const toggle = useCallback(() => {
    if (stateRef.current.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [play, pause]);

  /**
   * Stop and reset.
   */
  const stop = useCallback(() => {
    pause();
    updateStateForTime(0);
  }, [pause, updateStateForTime]);

  /**
   * Seek to specific time.
   */
  const seekTo = useCallback(
    (time: number) => {
      updateStateForTime(time);
    },
    [updateStateForTime]
  );

  /**
   * Seek to specific event.
   */
  const seekToEvent = useCallback(
    (index: number) => {
      if (!session || index < 0 || index >= session.events.length) return;
      updateStateForTime(session.events[index].timestamp);
    },
    [session, updateStateForTime]
  );

  /**
   * Seek to specific length.
   */
  const seekToLength = useCallback(
    (length: number) => {
      if (!session) return;
      const event = session.events.find((e) => e.lane === length);
      if (event) {
        updateStateForTime(event.timestamp);
      }
    },
    [session, updateStateForTime]
  );

  /**
   * Set playback speed.
   */
  const setSpeed = useCallback((speed: number) => {
    setState((prev) => ({ ...prev, playbackSpeed: speed }));
  }, []);

  /**
   * Step forward one event.
   */
  const stepForward = useCallback(() => {
    if (!session) return;
    const nextIndex = Math.min(state.currentEventIndex + 1, session.events.length - 1);
    seekToEvent(nextIndex);
  }, [session, state.currentEventIndex, seekToEvent]);

  /**
   * Step backward one event.
   */
  const stepBackward = useCallback(() => {
    const prevIndex = Math.max(state.currentEventIndex - 1, 0);
    seekToEvent(prevIndex);
  }, [state.currentEventIndex, seekToEvent]);

  /**
   * Skip to next length.
   */
  const nextLength = useCallback(() => {
    if (!session) return;
    const currentLength = state.currentEvent?.lane ?? 0;
    const nextEvent = session.events.find((e) => e.lane > currentLength);
    if (nextEvent) {
      updateStateForTime(nextEvent.timestamp);
    }
  }, [session, state.currentEvent, updateStateForTime]);

  /**
   * Skip to previous length.
   */
  const previousLength = useCallback(() => {
    if (!session) return;
    const currentLength = state.currentEvent?.lane ?? 0;
    const prevEvents = session.events.filter((e) => e.lane < currentLength);
    if (prevEvents.length > 0) {
      // Get first event of previous length
      const targetLength = prevEvents[prevEvents.length - 1].lane;
      const firstEvent = session.events.find((e) => e.lane === targetLength);
      if (firstEvent) {
        updateStateForTime(firstEvent.timestamp);
      }
    }
  }, [session, state.currentEvent, updateStateForTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && session && !state.isPlaying) {
      play();
    }
  }, [autoStart, session, state.isPlaying, play]);

  // Reset when session changes
  useEffect(() => {
    stop();
    if (session && session.events.length > 0) {
      setState((prev) => ({
        ...prev,
        currentEvent: session.events[0],
        currentEventIndex: 0,
      }));
    }
  }, [session?.id]);

  const isAtEnd = session ? state.currentTime >= session.duration : true;
  const isAtStart = state.currentTime === 0;

  return {
    state,
    play,
    pause,
    toggle,
    stop,
    seekTo,
    seekToEvent,
    seekToLength,
    setSpeed,
    stepForward,
    stepBackward,
    nextLength,
    previousLength,
    availableSpeeds,
    isAtEnd,
    isAtStart,
  };
}

export default useSessionReplay;
