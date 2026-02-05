/**
 * SessionReplayControls Component
 *
 * Control panel for session replay with play/pause, speed, and step controls.
 *
 * @module components/ui/SessionReplayControls
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Gauge,
  Waves,
} from 'lucide-react';
import { TimelineSlider, type TimelineMarker } from './TimelineSlider';
import { formatDuration } from '../../utils/formatters';
import type { ReplayState, StrokeEvent } from '../../hooks/useSessionReplay';

export interface SessionReplayControlsProps {
  /** Current replay state */
  state: ReplayState;
  /** Total duration in milliseconds */
  duration: number;
  /** Stroke events for markers */
  events?: StrokeEvent[];
  /** Length markers for timeline */
  lengthMarkers?: {
    lengthIndex: number;
    startTimestampMs: number;
    endTimestampMs: number;
    distanceMeters: number;
    strokeCount?: number;
    paceSeconds: number;
  }[];
  /** Play callback */
  onPlay: () => void;
  /** Pause callback */
  onPause: () => void;
  /** Toggle callback */
  onToggle: () => void;
  /** Stop callback */
  onStop: () => void;
  /** Seek callback */
  onSeek: (time: number) => void;
  /** Set speed callback */
  onSetSpeed: (speed: number) => void;
  /** Step forward callback */
  onStepForward: () => void;
  /** Step backward callback */
  onStepBackward: () => void;
  /** Next length callback */
  onNextLength: () => void;
  /** Previous length callback */
  onPreviousLength: () => void;
  /** Available speeds */
  availableSpeeds: number[];
  /** Is at end */
  isAtEnd: boolean;
  /** Is at start */
  isAtStart: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Speed selector component.
 */
const SpeedSelector: React.FC<{
  currentSpeed: number;
  speeds: number[];
  onChange: (speed: number) => void;
}> = ({ currentSpeed, speeds, onChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-muted hover:bg-muted/80 rounded transition-colors"
      >
        <Gauge className="w-3 h-3" />
        <span>{currentSpeed}x</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[80px] z-50"
          >
            {speeds.map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => {
                  onChange(speed);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-2 py-1 text-xs rounded text-left transition-colors
                  ${currentSpeed === speed ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                `}
              >
                {speed}x
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Stats display component.
 */
const StatsDisplay: React.FC<{
  currentLength: number;
  currentStroke: number;
  strokeType?: string;
  currentTime: number;
  duration: number;
}> = ({ currentLength, currentStroke, strokeType, currentTime, duration }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <Waves className="w-3 h-3" />
        <span>
          {t('replay.length', 'Length')}: <strong className="text-foreground">{currentLength}</strong>
        </span>
      </div>
      <div>
        {t('replay.time', 'Time')}: <strong className="text-foreground">{formatDuration(currentTime / 1000, 'short')}</strong>
        <span className="text-muted-foreground/70"> / {formatDuration(duration / 1000, 'short')}</span>
      </div>
      <div>
        {t('replay.stroke', 'Stroke')}: <strong className="text-foreground">{currentStroke}</strong>
      </div>
      {strokeType && (
        <div className="capitalize text-muted-foreground/70">
          {strokeType}
        </div>
      )}
    </div>
  );
};

/**
 * Control button component.
 */
const ControlButton: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  label: string;
}> = ({ icon, onClick, disabled, primary, label }) => (
  <motion.button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    whileTap={{ scale: 0.9 }}
    className={`
      flex items-center justify-center rounded-full transition-colors
      ${primary
        ? 'w-12 h-12 bg-primary text-primary-foreground hover:bg-primary/90'
        : 'w-8 h-8 bg-muted hover:bg-muted/80 text-foreground'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    {icon}
  </motion.button>
);

/**
 * SessionReplayControls for controlling session playback.
 *
 * @example
 * ```tsx
 * <SessionReplayControls
 *   state={replayState}
 *   duration={session.duration}
 *   events={session.events}
 *   onPlay={play}
 *   onPause={pause}
 *   onToggle={toggle}
 *   onStop={stop}
 *   onSeek={seekTo}
 *   onSetSpeed={setSpeed}
 *   onStepForward={stepForward}
 *   onStepBackward={stepBackward}
 *   onNextLength={nextLength}
 *   onPreviousLength={previousLength}
 *   availableSpeeds={availableSpeeds}
 *   isAtEnd={isAtEnd}
 *   isAtStart={isAtStart}
 * />
 * ```
 */
export const SessionReplayControls: React.FC<SessionReplayControlsProps> = ({
  state,
  duration,
  events = [],
  lengthMarkers = [],
  onPlay: _onPlay,
  onPause: _onPause,
  onToggle,
  onStop,
  onSeek,
  onSetSpeed,
  onStepForward,
  onStepBackward,
  onNextLength,
  onPreviousLength,
  availableSpeeds,
  isAtEnd,
  isAtStart,
  className = '',
}) => {
  const { t } = useTranslation();

  const handleToggle = React.useCallback(() => {
    if (onToggle) {
      onToggle();
      return;
    }

    if (state.isPlaying) {
      _onPause();
    } else {
      _onPlay();
    }
  }, [_onPause, _onPlay, onToggle, state.isPlaying]);

  // Generate markers from events
  const markers: TimelineMarker[] = React.useMemo(() => {
    if (!duration) return [];

    if (lengthMarkers.length > 0) {
      return lengthMarkers.map((marker) => ({
        position: (marker.startTimestampMs / duration) * 100,
        type: 'length' as const,
        label: `${t('replay.length', 'Length')} ${marker.lengthIndex + 1}`,
        tooltip: `${marker.distanceMeters}m • ${marker.paceSeconds}s/100m`,
      }));
    }

    if (!events.length) return [];

    const lengthStarts = new Map<number, StrokeEvent>();
    events.forEach((event) => {
      if (!lengthStarts.has(event.lane)) {
        lengthStarts.set(event.lane, event);
      }
    });

    return Array.from(lengthStarts.values()).map((event) => ({
      position: (event.timestamp / duration) * 100,
      type: event.isTurn ? 'turn' as const : 'length' as const,
      label: `${t('replay.length', 'Length')} ${event.lane}`,
      tooltip: `${event.strokeType} - ${event.distance}m`,
    }));
  }, [events, lengthMarkers, duration, t]);

  return (
    <div className={`bg-card border border-border rounded-xl p-4 ${className}`}>
      {/* Timeline slider */}
      <TimelineSlider
        value={state.progress}
        duration={duration}
        currentTime={state.currentTime}
        markers={markers}
        isPlaying={state.isPlaying}
        onChange={(value) => onSeek((value / 100) * duration)}
        onSeek={onSeek}
        onToggle={handleToggle}
        showTime
        showMarkers
      />

      {/* Controls row */}
      <div className="flex items-center justify-between mt-4">
        {/* Stats */}
        <StatsDisplay
          currentLength={state.currentLength}
          currentStroke={state.currentStroke}
          strokeType={state.currentEvent?.strokeType}
          currentTime={state.currentTime}
          duration={duration}
        />

        {/* Main controls */}
        <div className="flex items-center gap-2">
          {/* Previous length */}
          <ControlButton
            icon={<SkipBack className="w-4 h-4" />}
            onClick={onPreviousLength}
            disabled={isAtStart}
            label={t('replay.previousLength', 'Previous length')}
          />

          {/* Step backward */}
          <ControlButton
            icon={<ChevronLeft className="w-4 h-4" />}
            onClick={onStepBackward}
            disabled={isAtStart}
            label={t('replay.stepBackward', 'Step backward')}
          />

          {/* Play/Pause */}
          <ControlButton
            icon={state.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            onClick={handleToggle}
            primary
            label={state.isPlaying ? t('replay.pause', 'Pause') : t('replay.play', 'Play')}
          />

          {/* Step forward */}
          <ControlButton
            icon={<ChevronRight className="w-4 h-4" />}
            onClick={onStepForward}
            disabled={isAtEnd}
            label={t('replay.stepForward', 'Step forward')}
          />

          {/* Next length */}
          <ControlButton
            icon={<SkipForward className="w-4 h-4" />}
            onClick={onNextLength}
            disabled={isAtEnd}
            label={t('replay.nextLength', 'Next length')}
          />
        </div>

        {/* Speed and reset */}
        <div className="flex items-center gap-2">
          <SpeedSelector
            currentSpeed={state.playbackSpeed}
            speeds={availableSpeeds}
            onChange={onSetSpeed}
          />

          <ControlButton
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={onStop}
            label={t('replay.reset', 'Reset')}
          />
        </div>
      </div>
    </div>
  );
};

export default SessionReplayControls;
