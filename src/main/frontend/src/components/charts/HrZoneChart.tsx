/**
 * HrZoneChart Component
 *
 * Displays heart rate zones using ECharts gauge/pie visualization.
 * Features animated entry and color-coded zones.
 *
 * @module components/charts/HrZoneChart
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ReactECharts from 'echarts-for-react';
import clsx from 'clsx';
import { useGsap } from '../../hooks/useGsap';

export interface HrZoneData {
  zone: number;
  name: string;
  minHr: number;
  maxHr: number;
  timeInZone: number; // seconds
  percentage: number;
}

export interface HrZoneChartProps {
  /** Array of HR zone data */
  zones: HrZoneData[];
  /** Current heart rate */
  currentHr?: number;
  /** Max heart rate for the user */
  maxHr?: number;
  /** Chart height */
  height?: number;
  /** Show as gauge instead of bar chart */
  variant?: 'bars' | 'gauge';
  /** Additional CSS classes */
  className?: string;
}

/** Zone colors from recovery (blue) to max effort (red) */
const ZONE_COLORS = [
  '#3b82f6', // Zone 1 - Recovery (blue)
  '#22c55e', // Zone 2 - Aerobic (green)
  '#eab308', // Zone 3 - Tempo (yellow)
  '#f97316', // Zone 4 - Threshold (orange)
  '#ef4444', // Zone 5 - VO2max (red)
];

/**
 * HrZoneChart for visualizing heart rate zone distribution.
 *
 * @example
 * ```tsx
 * <HrZoneChart
 *   zones={hrZones}
 *   currentHr={145}
 *   maxHr={185}
 * />
 * ```
 */
export const HrZoneChart: React.FC<HrZoneChartProps> = ({
  zones,
  currentHr,
  maxHr = 200,
  height = 250,
  variant = 'bars',
  className,
}) => {
  const { t } = useTranslation();
  const chartRef = useRef<HTMLDivElement>(null);
  const { createChartMorph } = useGsap();

  // GSAP animation on mount
  useEffect(() => {
    if (chartRef.current) {
      createChartMorph(chartRef.current);
    }
  }, [createChartMorph]);

  // Calculate total time for percentage
  const totalTime = useMemo(() => {
    return zones.reduce((sum, z) => sum + z.timeInZone, 0);
  }, [zones]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Bar chart option
  const barOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const data = params[0];
        const zone = zones[data.dataIndex];
        return `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${zone.name}</div>
            <div>HR: ${zone.minHr}-${zone.maxHr} bpm</div>
            <div>Zeit: ${formatTime(zone.timeInZone)}</div>
            <div>Anteil: ${zone.percentage.toFixed(1)}%</div>
          </div>
        `;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: zones.map((z) => `Z${z.zone}`),
      axisLine: { lineStyle: { color: 'var(--color-border)' } },
      axisLabel: { color: 'var(--color-text-muted)' },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      axisLabel: {
        color: 'var(--color-text-muted)',
        formatter: '{value}%',
      },
      splitLine: {
        lineStyle: { color: 'var(--color-border)', opacity: 0.3 },
      },
    },
    series: [
      {
        type: 'bar',
        data: zones.map((z, i) => ({
          value: z.percentage,
          itemStyle: {
            color: ZONE_COLORS[i] || ZONE_COLORS[4],
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barWidth: '60%',
        animationDuration: 1500,
        animationEasing: 'elasticOut',
      },
    ],
  }), [zones]);

  // Gauge option (for current HR)
  const gaugeOption = useMemo(() => ({
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 60,
        max: maxHr,
        splitNumber: 5,
        center: ['50%', '75%'],
        radius: '90%',
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [0.2, ZONE_COLORS[0]],
              [0.4, ZONE_COLORS[1]],
              [0.6, ZONE_COLORS[2]],
              [0.8, ZONE_COLORS[3]],
              [1, ZONE_COLORS[4]],
            ],
          },
        },
        pointer: {
          icon: 'path://M2090.36389,615.30999 L2## End ##',
          length: '75%',
          width: 8,
          offsetCenter: [0, '5%'],
          itemStyle: { color: 'var(--color-foreground)' },
        },
        axisTick: {
          length: 10,
          lineStyle: { color: 'auto', width: 2 },
        },
        splitLine: {
          length: 15,
          lineStyle: { color: 'auto', width: 3 },
        },
        axisLabel: {
          color: 'var(--color-text-muted)',
          fontSize: 12,
          distance: -45,
          formatter: '{value}',
        },
        title: { show: false },
        detail: {
          fontSize: 28,
          offsetCenter: [0, '-20%'],
          valueAnimation: true,
          formatter: '{value} bpm',
          color: 'var(--color-foreground)',
        },
        data: [{ value: currentHr || 0 }],
        animationDuration: 2000,
        animationEasing: 'elasticOut',
      },
    ],
  }), [currentHr, maxHr]);

  return (
    <motion.div
      ref={chartRef}
      className={clsx('glass-card p-4', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {t('charts.hrZones')}
      </h3>

      {variant === 'gauge' && currentHr ? (
        <ReactECharts
          option={gaugeOption}
          style={{ height: height }}
          opts={{ renderer: 'svg' }}
        />
      ) : (
        <>
          <ReactECharts
            option={barOption}
            style={{ height: height }}
            opts={{ renderer: 'svg' }}
          />

          {/* Zone Legend */}
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {zones.map((zone, i) => (
              <motion.div
                key={zone.zone}
                className="flex items-center gap-2 text-sm"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: ZONE_COLORS[i] }}
                />
                <span className="text-muted">{zone.name}</span>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Total time display */}
      {totalTime > 0 && (
        <div className="text-center mt-4 text-sm text-muted">
          Gesamtzeit: <span className="font-semibold text-foreground">{formatTime(totalTime)}</span>
        </div>
      )}
    </motion.div>
  );
};

export default HrZoneChart;
