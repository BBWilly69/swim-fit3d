/**
 * PaceTrendChart Component
 *
 * Displays pace trends over time using Recharts.
 * Features animated entry, gradient fill, and interactive tooltips.
 *
 * @module components/charts/PaceTrendChart
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import clsx from 'clsx';
import { useGsap } from '../../hooks/useGsap';
import { formatPace } from '../../utils/formatters';

export interface PaceDataPoint {
  date: string | Date;
  pace: number; // seconds per 100m
  distance?: number;
  avgHr?: number;
}

export interface PaceTrendChartProps {
  /** Array of pace data points */
  data: PaceDataPoint[];
  /** Show average reference line */
  showAverage?: boolean;
  /** Show target pace line */
  targetPace?: number;
  /** Height of the chart */
  height?: number;
  /** Additional CSS classes */
  className?: string;
  /** Chart title (i18n key) */
  titleKey?: string;
}

/**
 * Custom tooltip component for the chart.
 */
const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ value: number; payload: PaceDataPoint }>;
  label?: string;
}> = ({ active, payload, label }) => {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;

  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-3 shadow-lg"
    >
      <p className="text-sm font-medium text-foreground mb-1">
        {format(new Date(label || ''), 'PPP', { locale })}
      </p>
      <div className="space-y-1">
        <p className="text-sm">
          <span className="text-muted">Pace:</span>{' '}
          <span className="font-semibold text-primary">{formatPace(data.pace)}</span>
        </p>
        {data.distance && (
          <p className="text-sm">
            <span className="text-muted">Distanz:</span>{' '}
            <span className="font-semibold">{data.distance}m</span>
          </p>
        )}
        {data.avgHr && (
          <p className="text-sm">
            <span className="text-muted">HR:</span>{' '}
            <span className="font-semibold">{data.avgHr} bpm</span>
          </p>
        )}
      </div>
    </motion.div>
  );
};

/**
 * PaceTrendChart for visualizing pace improvements over time.
 *
 * @example
 * ```tsx
 * <PaceTrendChart
 *   data={paceHistory}
 *   showAverage
 *   targetPace={90}
 * />
 * ```
 */
export const PaceTrendChart: React.FC<PaceTrendChartProps> = ({
  data,
  showAverage = true,
  targetPace,
  height = 300,
  className,
  titleKey = 'charts.paceTrend',
}) => {
  const { t } = useTranslation();
  const chartRef = useRef<HTMLDivElement>(null);
  const { createChartMorph } = useGsap();

  // Calculate average pace
  const averagePace = useMemo(() => {
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.pace, 0) / data.length;
  }, [data]);

  // Format data for Recharts
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      date: typeof d.date === 'string' ? d.date : d.date.toISOString(),
      // Invert pace for better visualization (lower = faster = higher on chart)
      displayPace: d.pace,
    }));
  }, [data]);

  // GSAP animation on mount
  useEffect(() => {
    if (chartRef.current) {
      createChartMorph(chartRef.current);
    }
  }, [createChartMorph]);

  // Get min/max for Y axis (with some padding)
  const [minPace, maxPace] = useMemo(() => {
    if (data.length === 0) return [60, 180];
    const paces = data.map((d) => d.pace);
    const min = Math.min(...paces);
    const max = Math.max(...paces);
    const padding = (max - min) * 0.1;
    return [Math.max(0, min - padding), max + padding];
  }, [data]);

  return (
    <motion.div
      ref={chartRef}
      className={clsx('glass-card p-4', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {t(titleKey)}
      </h3>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="paceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            opacity={0.5}
          />

          <XAxis
            dataKey="date"
            tickFormatter={(value) => format(new Date(value), 'dd.MM')}
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 12 }}
          />

          <YAxis
            domain={[minPace, maxPace]}
            tickFormatter={(value) => formatPace(value)}
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 12 }}
            // Reverse axis so faster (lower) is at top
            reversed
          />

          <Tooltip content={<CustomTooltip />} />

          {showAverage && averagePace > 0 && (
            <ReferenceLine
              y={averagePace}
              stroke="var(--color-secondary)"
              strokeDasharray="5 5"
              label={{
                value: `Ø ${formatPace(averagePace)}`,
                position: 'right',
                fill: 'var(--color-secondary)',
                fontSize: 12,
              }}
            />
          )}

          {targetPace && (
            <ReferenceLine
              y={targetPace}
              stroke="var(--color-success)"
              strokeDasharray="3 3"
              label={{
                value: `Ziel ${formatPace(targetPace)}`,
                position: 'right',
                fill: 'var(--color-success)',
                fontSize: 12,
              }}
            />
          )}

          <Area
            type="monotone"
            dataKey="displayPace"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#paceGradient)"
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-muted">Pace</span>
        </div>
        {showAverage && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-secondary" style={{ borderStyle: 'dashed' }} />
            <span className="text-muted">Durchschnitt</span>
          </div>
        )}
        {targetPace && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-success" />
            <span className="text-muted">Ziel</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PaceTrendChart;
