/**
 * TimelineSlider Component
 *
 * A scrubbing slider for session replay with markers for lengths/turns.
 * Supports drag, click-to-seek, and keyboard navigation.
 *
 * @module components/ui/TimelineSlider
 */

import React, { useRef, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatDuration } from '../../utils/formatters';

export interface TimelineMarker {
  /** Position (0-100) */
  position: number;
  /** Marker type */
  type: 'length' | 'turn' | 'event' | 'milestone';
  /** Label */
  label: string;
  /** Tooltip content */
  tooltip?: string;
  /** Color override */
  color?: string;
}

export interface TimelineSliderProps {
  /** Current value (0-100) */
  value: number;
  /** Total duration in milliseconds */
  duration: number;
  /** Current time in milliseconds */
  currentTime: number;
  /** Markers to display */
  markers?: TimelineMarker[];
  /** Is playing */
  isPlaying?: boolean;
  /** Buffer/loaded percentage */
  buffered?: number;
  /** Change callback */
  onChange: (value: number) => void;
  /** Seek callback with time in ms */
  onSeek?: (time: number) => void;
  /** Play/pause toggle */
  onToggle?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Show time labels */
  showTime?: boolean;
  /** Show markers */
  showMarkers?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Marker dot component.
 */
const MarkerDot: React.FC<{
  marker: TimelineMarker;
  onHover: (marker: TimelineMarker | null) => void;
}> = ({ marker, onHover }) => {
  const colorMap = {
    length: 'bg-blue-500',
    turn: 'bg-amber-500',
    event: 'bg-purple-500',
    milestone: 'bg-emerald-500',
  };

  return (
    <motion.div
      className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full cursor-pointer z-10 ${
        marker.color ?? colorMap[marker.type]
      }`}
      style={{ left: `${marker.position}%` }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.5 }}
      onMouseEnter={() => onHover(marker)}
      onMouseLeave={() => onHover(null)}
    />
  );
};

/**
 * Tooltip component.
 */
const Tooltip: React.FC<{
  marker: TimelineMarker;
  position: number;
}> = ({ marker, position }) => (
  <motion.div
    className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900/90 text-white text-xs rounded whitespace-nowrap z-20"
    style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 5 }}
  >
    <div className="font-medium">{marker.label}</div>
    {marker.tooltip && (
      <div className="text-gray-300 text-[10px]">{marker.tooltip}</div>
    )}
    <div
      className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/90"
    />
  </motion.div>
);

/**
 * TimelineSlider for session replay scrubbing.
 *
 * @example
 * ```tsx
 * <TimelineSlider
 *   value={progress}
 *   duration={session.duration}
 *   currentTime={state.currentTime}
 *   markers={lengthMarkers}
 *   isPlaying={state.isPlaying}
 *   onChange={setProgress}
 *   onSeek={seekTo}
 *   onToggle={toggle}
 *   showTime
 *   showMarkers
 * />
 * ```
 */
export const TimelineSlider: React.FC<TimelineSliderProps> = ({
  value,
  duration,
  currentTime,
  markers = [],
  isPlaying = false,
  buffered = 100,
  onChange,
  onSeek,
  onToggle,
  disabled = false,
  showTime = true,
  showMarkers = true,
  className = '',
}) => {
  const { t } = useTranslation();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredMarker, setHoveredMarker] = useState<TimelineMarker | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number>(0);

  /**
   * Calculate position from mouse event.
   */
  const calculatePosition = useCallback(
    (clientX: number): number => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      return percentage;
    },
    []
  );

  /**
   * Handle mouse down on track.
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(true);
      const position = calculatePosition(e.clientX);
      onChange(position);
      onSeek?.((position / 100) * duration);
    },
    [disabled, calculatePosition, onChange, onSeek, duration]
  );

  /**
   * Handle mouse move.
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const position = calculatePosition(e.clientX);
      setHoverPosition(position);
      setHoverTime((position / 100) * duration);

      if (isDragging && !disabled) {
        onChange(position);
        onSeek?.((position / 100) * duration);
      }
    },
    [isDragging, disabled, calculatePosition, onChange, onSeek, duration]
  );

  /**
   * Handle mouse up.
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * Handle mouse leave.
   */
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoverPosition(null);
  }, []);

  /**
   * Handle keyboard navigation.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      const step = e.shiftKey ? 10 : 1;
      let newValue = value;

      switch (e.key) {
        case 'ArrowLeft':
          newValue = Math.max(0, value - step);
          break;
        case 'ArrowRight':
          newValue = Math.min(100, value + step);
          break;
        case 'Home':
          newValue = 0;
          break;
        case 'End':
          newValue = 100;
          break;
        case ' ':
          e.preventDefault();
          onToggle?.();
          return;
        default:
          return;
      }

      onChange(newValue);
      onSeek?.((newValue / 100) * duration);
    },
    [disabled, value, onChange, onSeek, duration, onToggle]
  );

  /**
   * Format time for display.
   */
  const formatTime = useMemo(
    () => (ms: number) => formatDuration(Math.round(ms / 1000), 'minimal'),
    []
  );

  return (
    <div className={`w-full ${className}`}>
      {/* Time labels */}
      {showTime && (
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span className="tabular-nums">{formatTime(currentTime)}</span>
          <span className="tabular-nums">{formatTime(duration)}</span>
        </div>
      )}

      {/* Slider track */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('timeline.slider', 'Timeline slider')}
        aria-disabled={disabled}
        className={`
          relative h-6 cursor-pointer select-none
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
      >
        {/* Background track */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-muted rounded-full overflow-hidden">
          {/* Buffered indicator */}
          <div
            className="absolute h-full bg-muted-foreground/20 rounded-full"
            style={{ width: `${buffered}%` }}
          />

          {/* Progress fill */}
          <motion.div
            className="absolute h-full bg-primary rounded-full"
            style={{ width: `${value}%` }}
            layoutId="progress"
          />
        </div>

        {/* Markers */}
        {showMarkers && markers.length > 0 && (
          <div className="absolute inset-0">
            {markers.map((marker, i) => (
              <MarkerDot
                key={`${marker.type}-${i}`}
                marker={marker}
                onHover={setHoveredMarker}
              />
            ))}
          </div>
        )}

        {/* Thumb */}
        <motion.div
          className={`
            absolute top-1/2 -translate-y-1/2 -translate-x-1/2 
            w-4 h-4 bg-primary rounded-full shadow-lg
            border-2 border-white dark:border-gray-900
            ${isDragging ? 'scale-125' : ''}
            ${disabled ? '' : 'hover:scale-110'}
            transition-transform
          `}
          style={{ left: `${value}%` }}
          animate={{
            scale: isDragging ? 1.25 : 1,
            boxShadow: isPlaying
              ? '0 0 0 4px rgba(var(--primary-rgb), 0.3)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        />

        {/* Hover time indicator */}
        <AnimatePresence>
          {hoverPosition !== null && !isDragging && (
            <motion.div
              className="absolute bottom-full mb-2 px-1.5 py-0.5 bg-gray-800/90 text-white text-[10px] rounded whitespace-nowrap"
              style={{
                left: `${hoverPosition}%`,
                transform: 'translateX(-50%)',
              }}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
            >
              {formatTime(hoverTime)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Marker tooltip */}
        <AnimatePresence>
          {hoveredMarker && (
            <Tooltip marker={hoveredMarker} position={hoveredMarker.position} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TimelineSlider;
