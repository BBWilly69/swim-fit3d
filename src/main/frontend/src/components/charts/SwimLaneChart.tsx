/**
 * SwimLaneChart Component
 *
 * A custom SVG visualization that displays swim activity as a pool lane.
 * Each length is shown as a segment with stroke type color coding and HR overlay.
 *
 * Features:
 * - Pool lane visualization with turn indicators
 * - Stroke type color coding
 * - Heart rate color overlay
 * - Interactive hover for length details
 * - Animated swimming icon
 *
 * @module components/charts/SwimLaneChart
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { SwimLap, SwimLength, StrokeType, HrSample } from '../../types';
import { formatPace, formatDuration } from '../../utils/formatters';
import { getStrokeColor } from '../../utils/theme';

export interface SwimLaneChartProps {
  /** Array of swim laps to visualize */
  laps: SwimLap[];
  /** Heart rate samples for overlay (optional) */
  hrSamples?: HrSample[];
  /** Pool length in meters */
  poolLength: 25 | 50;
  /** Chart width */
  width?: number;
  /** Chart height */
  height?: number;
  /** Whether to show HR overlay */
  showHr?: boolean;
  /** Whether to show stroke colors */
  showStrokes?: boolean;
  /** Whether to show lap numbers */
  showLapNumbers?: boolean;
  /** Callback when a length is clicked */
  onLengthClick?: (lap: SwimLap, length: SwimLength) => void;
  /** Additional CSS classes */
  className?: string;
}

interface LengthSegment {
  lapIndex: number;
  lengthIndex: number;
  stroke: StrokeType;
  direction: 'down' | 'up';
  pace: number;
  hr?: number;
  swolf: number;
  y: number;
  length: SwimLength;
  lap: SwimLap;
}

const LANE_PADDING = 40;
const LANE_WIDTH = 60;
// const TURN_RADIUS = 20; // Reserved for future use

/**
 * Maps HR value to a color for visualization.
 *
 * @param hr - Heart rate in BPM
 * @param maxHr - Maximum heart rate (default: 190)
 * @returns HSL color string
 */
function hrToColor(hr: number, maxHr = 190): string {
  const percentage = Math.min(100, (hr / maxHr) * 100);
  // Blue (low) -> Green -> Yellow -> Red (high)
  const hue = Math.max(0, 240 - (percentage * 2.4));
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * SwimLaneChart component for pool-style activity visualization.
 *
 * @example
 * ```tsx
 * <SwimLaneChart
 *   laps={activity.laps}
 *   hrSamples={activity.hrSamples}
 *   poolLength={25}
 *   showHr
 *   onLengthClick={(lap, length) => showDetails(length)}
 * />
 * ```
 */
export const SwimLaneChart: React.FC<SwimLaneChartProps> = ({
  laps,
  hrSamples,
  poolLength: _poolLength, // Reserved for future use
  width = 800,
  height = 600,
  showHr = true,
  showStrokes = true,
  showLapNumbers = true,
  onLengthClick,
  className,
}) => {
  const { t } = useTranslation();
  const [hoveredSegment, setHoveredSegment] = useState<LengthSegment | null>(null);

  // Calculate all length segments for visualization
  const segments = useMemo<LengthSegment[]>(() => {
    const result: LengthSegment[] = [];
    let globalLengthIndex = 0;

    laps.forEach((lap, lapIndex) => {
      lap.lengths.forEach((length, lengthIndex) => {
        // Calculate HR at this point if available
        let hr: number | undefined;
        if (hrSamples && hrSamples.length > 0) {
          // Simple interpolation based on position
          const position = globalLengthIndex / laps.reduce((sum, l) => sum + l.lengths.length, 0);
          const sampleIndex = Math.floor(position * hrSamples.length);
          hr = hrSamples[sampleIndex]?.bpm;
        }

        result.push({
          lapIndex,
          lengthIndex,
          stroke: length.strokeType,
          direction: (globalLengthIndex % 2 === 0) ? 'down' : 'up',
          pace: length.avgPace,
          hr: hr ?? lap.avgHr,
          swolf: length.swolf,
          y: globalLengthIndex,
          length,
          lap,
        });

        globalLengthIndex++;
      });
    });

    return result;
  }, [laps, hrSamples]);

  // Calculate dimensions
  const totalLengths = segments.length;
  const segmentHeight = Math.max(20, Math.min(40, (height - LANE_PADDING * 2) / totalLengths));
  const actualHeight = Math.max(height, totalLengths * segmentHeight + LANE_PADDING * 2);

  // Render a single length segment
  const renderSegment = useCallback((segment: LengthSegment) => {
    const isHovered = hoveredSegment?.y === segment.y;
    const y = LANE_PADDING + segment.y * segmentHeight;
    const strokeColor = showStrokes ? getStrokeColor(segment.stroke) : '#3b82f6';
    const hrColor = showHr && segment.hr ? hrToColor(segment.hr) : undefined;

    return (
      <g
        key={`${segment.lapIndex}-${segment.lengthIndex}`}
        className="cursor-pointer transition-opacity"
        style={{ opacity: hoveredSegment && !isHovered ? 0.5 : 1 }}
        onMouseEnter={() => setHoveredSegment(segment)}
        onMouseLeave={() => setHoveredSegment(null)}
        onClick={() => onLengthClick?.(segment.lap, segment.length)}
      >
        {/* Lane background */}
        <rect
          x={LANE_PADDING}
          y={y}
          width={LANE_WIDTH * 3}
          height={segmentHeight - 2}
          rx={4}
          fill={hrColor ?? 'var(--color-surface)'}
          stroke={strokeColor}
          strokeWidth={isHovered ? 2 : 1}
          className="transition-all"
        />

        {/* Stroke type indicator */}
        <rect
          x={LANE_PADDING + 2}
          y={y + 2}
          width={8}
          height={segmentHeight - 6}
          rx={2}
          fill={strokeColor}
        />

        {/* Direction arrow */}
        <path
          d={
            segment.direction === 'down'
              ? `M ${LANE_PADDING + LANE_WIDTH * 1.5} ${y + 4} l -6 8 l 12 0 z`
              : `M ${LANE_PADDING + LANE_WIDTH * 1.5} ${y + segmentHeight - 4} l -6 -8 l 12 0 z`
          }
          fill={strokeColor}
          opacity={0.6}
        />

        {/* Pace label */}
        <text
          x={LANE_PADDING + LANE_WIDTH * 2.5}
          y={y + segmentHeight / 2 + 4}
          textAnchor="start"
          className="text-xs fill-muted"
        >
          {formatPace(segment.pace)}
        </text>

        {/* HR indicator if present */}
        {showHr && segment.hr && (
          <text
            x={LANE_PADDING + LANE_WIDTH * 3 + 10}
            y={y + segmentHeight / 2 + 4}
            textAnchor="start"
            className="text-xs"
            fill={hrColor}
          >
            ♥ {segment.hr}
          </text>
        )}

        {/* Lap number at start of each lap */}
        {showLapNumbers && segment.lengthIndex === 0 && (
          <text
            x={LANE_PADDING - 25}
            y={y + segmentHeight / 2 + 4}
            textAnchor="middle"
            className="text-xs font-semibold fill-primary"
          >
            L{segment.lapIndex + 1}
          </text>
        )}
      </g>
    );
  }, [hoveredSegment, segmentHeight, showHr, showStrokes, showLapNumbers, onLengthClick]);

  // Render the pool lane lines
  const renderPoolLanes = () => (
    <g className="pool-lanes" opacity={0.3}>
      {/* Left wall */}
      <line
        x1={LANE_PADDING - 5}
        y1={LANE_PADDING}
        x2={LANE_PADDING - 5}
        y2={actualHeight - LANE_PADDING}
        stroke="var(--color-border)"
        strokeWidth={4}
      />
      {/* Right wall */}
      <line
        x1={LANE_PADDING + LANE_WIDTH * 3 + 5}
        y1={LANE_PADDING}
        x2={LANE_PADDING + LANE_WIDTH * 3 + 5}
        y2={actualHeight - LANE_PADDING}
        stroke="var(--color-border)"
        strokeWidth={4}
      />
      {/* Lane dividers */}
      {[1, 2].map((i) => (
        <line
          key={i}
          x1={LANE_PADDING + LANE_WIDTH * i}
          y1={LANE_PADDING}
          x2={LANE_PADDING + LANE_WIDTH * i}
          y2={actualHeight - LANE_PADDING}
          stroke="var(--color-primary)"
          strokeWidth={1}
          strokeDasharray="8 4"
        />
      ))}
    </g>
  );

  // Render swimming person icon
  const renderSwimmer = () => (
    <motion.g
      animate={{
        y: [0, actualHeight - LANE_PADDING * 2, 0],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <text
        x={LANE_PADDING + LANE_WIDTH * 1.5}
        y={LANE_PADDING + 20}
        textAnchor="middle"
        className="text-2xl"
      >
        🏊
      </text>
    </motion.g>
  );

  return (
    <div className={clsx('relative', className)}>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        {showStrokes && (
          <>
            <span className="text-muted font-medium">{t('strokes.freestyle')}:</span>
            {['FREESTYLE', 'BREASTSTROKE', 'BACKSTROKE', 'BUTTERFLY'].map((stroke) => (
              <div key={stroke} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: getStrokeColor(stroke) }}
                />
                <span className="text-muted text-xs">
                  {t(`strokes.${stroke.toLowerCase()}`)}
                </span>
              </div>
            ))}
          </>
        )}
        {showHr && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-muted text-xs">HR:</span>
            <div className="flex h-3 w-20 rounded overflow-hidden">
              {[120, 140, 160, 180].map((hr) => (
                <div
                  key={hr}
                  className="flex-1"
                  style={{ backgroundColor: hrToColor(hr) }}
                />
              ))}
            </div>
            <span className="text-muted text-xs">Low → High</span>
          </div>
        )}
      </div>

      {/* SVG Chart */}
      <svg
        width={width}
        height={actualHeight}
        className="bg-background/50 rounded-xl overflow-hidden"
      >
        {renderPoolLanes()}
        {segments.map(renderSegment)}
        {renderSwimmer()}
      </svg>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredSegment && (
          <motion.div
            className="absolute glass-card p-3 shadow-xl z-50 min-w-[200px]"
            style={{
              left: LANE_PADDING + LANE_WIDTH * 3 + 100,
              top: LANE_PADDING + hoveredSegment.y * segmentHeight,
            }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <div className="text-sm font-semibold text-foreground mb-2">
              {t('analysis.lengthDetails')} #{hoveredSegment.lengthIndex + 1}
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">{t('strokes.freestyle')}:</span>
                <span className="font-medium" style={{ color: getStrokeColor(hoveredSegment.stroke) }}>
                  {t(`strokes.${hoveredSegment.stroke.toLowerCase()}`)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Pace:</span>
                <span className="font-medium">{formatPace(hoveredSegment.pace)}/100m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">SWOLF:</span>
                <span className="font-medium">{hoveredSegment.swolf}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">{t('stats.totalStrokes')}:</span>
                <span className="font-medium">{hoveredSegment.length.strokeCount}</span>
              </div>
              {hoveredSegment.hr && (
                <div className="flex justify-between">
                  <span className="text-muted">HR:</span>
                  <span className="font-medium" style={{ color: hrToColor(hoveredSegment.hr) }}>
                    {hoveredSegment.hr} bpm
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">{t('stats.totalTime')}:</span>
                <span className="font-medium">
                  {formatDuration(hoveredSegment.length.durationMs / 1000, 'minimal')}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SwimLaneChart;
