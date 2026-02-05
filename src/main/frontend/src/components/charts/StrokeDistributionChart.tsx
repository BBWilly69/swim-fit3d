/**
 * StrokeDistributionChart Component
 *
 * Displays stroke type distribution using Recharts PieChart.
 * Shows percentage breakdown of freestyle, breaststroke, etc.
 *
 * @module components/charts/StrokeDistributionChart
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
  Tooltip,
} from 'recharts';
import clsx from 'clsx';
import { useGsap } from '../../hooks/useGsap';
import { formatDistance, formatDuration } from '../../utils/formatters';

export type StrokeType = 'freestyle' | 'breaststroke' | 'backstroke' | 'butterfly' | 'mixed' | 'drill';

export interface StrokeData {
  type: StrokeType;
  distance: number; // meters
  duration: number; // seconds
  lengths: number;
  avgPace: number; // seconds per 100m
}

export interface StrokeDistributionChartProps {
  /** Array of stroke distribution data */
  data: StrokeData[];
  /** Height of the chart */
  height?: number;
  /** Show by distance or duration */
  displayMode?: 'distance' | 'duration';
  /** Additional CSS classes */
  className?: string;
}

/** Stroke colors - each stroke type has a distinct color */
const STROKE_COLORS: Record<StrokeType, string> = {
  freestyle: '#3b82f6',    // Blue
  breaststroke: '#22c55e', // Green
  backstroke: '#f97316',   // Orange
  butterfly: '#a855f7',    // Purple
  mixed: '#6b7280',        // Gray
  drill: '#eab308',        // Yellow
};

/** Stroke icons/emojis for visual identification */
const STROKE_ICONS: Record<StrokeType, string> = {
  freestyle: '🏊',
  breaststroke: '🐸',
  backstroke: '🔄',
  butterfly: '🦋',
  mixed: '🔀',
  drill: '🎯',
};

/**
 * Active sector renderer for interactive hover.
 */
const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 15}
        outerRadius={outerRadius + 20}
        fill={fill}
        opacity={0.3}
      />
      <text x={cx} y={cy - 10} textAnchor="middle" fill="var(--color-foreground)" fontSize={16}>
        {STROKE_ICONS[payload.type as StrokeType]} {payload.name}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="var(--color-text-muted)" fontSize={14}>
        {(percent * 100).toFixed(1)}%
      </text>
    </g>
  );
};

/**
 * StrokeDistributionChart for visualizing stroke type breakdown.
 *
 * @example
 * ```tsx
 * <StrokeDistributionChart
 *   data={strokeStats}
 *   displayMode="distance"
 * />
 * ```
 */
export const StrokeDistributionChart: React.FC<StrokeDistributionChartProps> = ({
  data,
  height = 300,
  displayMode = 'distance',
  className,
}) => {
  const { t } = useTranslation();
  const chartRef = useRef<HTMLDivElement>(null);
  const { createChartMorph } = useGsap();
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // GSAP animation on mount
  useEffect(() => {
    if (chartRef.current) {
      createChartMorph(chartRef.current);
    }
  }, [createChartMorph]);

  // Transform data for Recharts
  const chartData = useMemo(() => {
    const total = data.reduce((sum, d) =>
      sum + (displayMode === 'distance' ? d.distance : d.duration), 0);

    return data
      .filter((d) => (displayMode === 'distance' ? d.distance : d.duration) > 0)
      .map((d) => ({
        ...d,
        name: t(`strokes.${d.type}`),
        value: displayMode === 'distance' ? d.distance : d.duration,
        percentage: ((displayMode === 'distance' ? d.distance : d.duration) / total) * 100,
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, displayMode, t]);

  // Calculate totals
  const totals = useMemo(() => ({
    distance: data.reduce((sum, d) => sum + d.distance, 0),
    duration: data.reduce((sum, d) => sum + d.duration, 0),
    lengths: data.reduce((sum, d) => sum + d.lengths, 0),
  }), [data]);

  const handlePieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const handlePieLeave = () => {
    setActiveIndex(undefined);
  };

  return (
    <motion.div
      ref={chartRef}
      className={clsx('glass-card p-4', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {t('charts.strokeDistribution')}
        </h3>

        {/* Toggle buttons */}
        <div className="flex gap-1 bg-surface rounded-lg p-1">
          <button
            className={clsx(
              'px-3 py-1 text-sm rounded-md transition-colors',
              displayMode === 'distance'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted hover:text-foreground'
            )}
            onClick={() => {/* Controlled externally */}}
          >
            {t('charts.byDistance')}
          </button>
          <button
            className={clsx(
              'px-3 py-1 text-sm rounded-md transition-colors',
              displayMode === 'duration'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted hover:text-foreground'
            )}
            onClick={() => {/* Controlled externally */}}
          >
            {t('charts.byDuration')}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Pie Chart */}
        <div style={{ width: '60%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                activeShape={renderActiveShape}
                onMouseEnter={handlePieEnter}
                onMouseLeave={handlePieLeave}
                animationBegin={0}
                animationDuration={1500}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.type}
                    fill={STROKE_COLORS[entry.type]}
                    stroke="var(--color-background)"
                    strokeWidth={2}
                    style={activeIndex === index ? { transform: 'scale(1.05)', transformOrigin: 'center' } : {}}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as StrokeData & { name: string };
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass-card p-3 shadow-lg"
                    >
                      <p className="font-medium mb-1">{STROKE_ICONS[d.type]} {d.name}</p>
                      <p className="text-sm">
                        <span className="text-muted">Distanz:</span> {formatDistance(d.distance)}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted">Zeit:</span> {formatDuration(d.duration)}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted">Bahnen:</span> {d.lengths}
                      </p>
                    </motion.div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          <AnimatePresence>
            {chartData.map((entry, index) => (
              <motion.div
                key={entry.type}
                className={clsx(
                  'flex items-center gap-3 p-2 rounded-lg transition-colors',
                  activeIndex === index && 'bg-surface'
                )}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STROKE_COLORS[entry.type] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {STROKE_ICONS[entry.type]} {entry.name}
                    </span>
                  </div>
                  <div className="text-xs text-muted">
                    {displayMode === 'distance'
                      ? formatDistance(entry.distance)
                      : formatDuration(entry.duration)}
                  </div>
                </div>
                <div className="text-sm font-semibold text-primary">
                  {entry.percentage.toFixed(1)}%
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-lg font-bold text-primary">{formatDistance(totals.distance)}</div>
          <div className="text-xs text-muted">{t('charts.totalDistance')}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-secondary">{formatDuration(totals.duration)}</div>
          <div className="text-xs text-muted">{t('charts.totalDuration')}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-accent">{totals.lengths}</div>
          <div className="text-xs text-muted">{t('charts.totalLengths')}</div>
        </div>
      </div>
    </motion.div>
  );
};

export default StrokeDistributionChart;
