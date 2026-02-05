/**
 * HeatmapCalendar Component
 *
 * Displays swim activity frequency using Nivo Calendar heatmap.
 * GitHub-style contribution graph for swim workouts.
 *
 * @module components/charts/HeatmapCalendar
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ResponsiveCalendar } from '@nivo/calendar';
import clsx from 'clsx';
import { useGsap } from '../../hooks/useGsap';

export interface CalendarDataPoint {
  day: string; // YYYY-MM-DD format
  value: number; // Distance in meters or count
}

export interface HeatmapCalendarProps {
  /** Array of calendar data points */
  data: CalendarDataPoint[];
  /** Start date for the calendar (YYYY-MM-DD) */
  from: string;
  /** End date for the calendar (YYYY-MM-DD) */
  to: string;
  /** Height of the chart */
  height?: number;
  /** Value type for display */
  valueType?: 'distance' | 'count' | 'duration';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Color scale for swim distance heatmap.
 * From light blue (low) to deep blue (high).
 */
const SWIM_COLOR_SCALE = [
  '#e0f2fe', // Very light
  '#7dd3fc', // Light
  '#38bdf8', // Medium
  '#0ea5e9', // Strong
  '#0369a1', // Dark
];

/**
 * HeatmapCalendar for visualizing swim activity frequency.
 *
 * @example
 * ```tsx
 * <HeatmapCalendar
 *   data={activityHistory}
 *   from="2024-01-01"
 *   to="2024-12-31"
 * />
 * ```
 */
export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  data,
  from,
  to,
  height = 180,
  valueType = 'distance',
  className,
}) => {
  const { t, i18n } = useTranslation();
  const chartRef = useRef<HTMLDivElement>(null);
  const { createChartMorph } = useGsap();

  // GSAP animation on mount
  useEffect(() => {
    if (chartRef.current) {
      createChartMorph(chartRef.current);
    }
  }, [createChartMorph]);

  // Calculate statistics
  const stats = useMemo(() => {
    const nonZero = data.filter((d) => d.value > 0);
    const total = nonZero.reduce((sum, d) => sum + d.value, 0);
    const count = nonZero.length;
    const max = Math.max(...data.map((d) => d.value), 0);
    return { total, count, max };
  }, [data]);

  // Format value based on type
  const formatValue = (value: number): string => {
    switch (valueType) {
      case 'distance':
        return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${value} m`;
      case 'duration':
        const mins = Math.floor(value / 60);
        return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
      case 'count':
      default:
        return `${value}`;
    }
  };

  // German month names for locale
  const monthLegend = i18n.language === 'de'
    ? (_year: number, month: number) =>
        ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][month]
    : undefined;

  return (
    <motion.div
      ref={chartRef}
      className={clsx('glass-card p-4', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {t('charts.activityCalendar')}
      </h3>

      {/* Statistics summary */}
      <div className="flex justify-center gap-6 mb-4">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-2xl font-bold text-primary">{stats.count}</div>
          <div className="text-xs text-muted">{t('charts.swimDays')}</div>
        </motion.div>
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-2xl font-bold text-secondary">
            {formatValue(stats.total)}
          </div>
          <div className="text-xs text-muted">{t('charts.totalDistance')}</div>
        </motion.div>
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-2xl font-bold text-accent">
            {formatValue(stats.max)}
          </div>
          <div className="text-xs text-muted">{t('charts.maxDistance')}</div>
        </motion.div>
      </div>

      <div style={{ height }}>
        <ResponsiveCalendar
          data={data}
          from={from}
          to={to}
          emptyColor="var(--color-surface)"
          colors={SWIM_COLOR_SCALE}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          yearSpacing={40}
          monthBorderColor="var(--color-border)"
          dayBorderWidth={2}
          dayBorderColor="var(--color-background)"
          monthLegend={monthLegend}
          legends={[
            {
              anchor: 'bottom-right',
              direction: 'row',
              translateY: 36,
              itemCount: 4,
              itemWidth: 42,
              itemHeight: 36,
              itemsSpacing: 14,
              itemDirection: 'right-to-left',
            },
          ]}
          tooltip={({ day, value }) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-2 shadow-lg"
            >
              <div className="text-sm font-medium">{day}</div>
              <div className="text-sm text-primary">{formatValue(typeof value === 'number' ? value : 0)}</div>
            </motion.div>
          )}
        />
      </div>

      {/* Color legend */}
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted">
        <span>{t('charts.less')}</span>
        {SWIM_COLOR_SCALE.map((color, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: color }}
          />
        ))}
        <span>{t('charts.more')}</span>
      </div>
    </motion.div>
  );
};

export default HeatmapCalendar;
