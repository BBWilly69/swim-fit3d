/**
 * StatTile Component
 *
 * A statistics display tile with icon, label, value, and optional trend indicator.
 * Clickable to show detailed information in a modal.
 *
 * @module components/ui/StatTile
 */

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatTileProps {
  /** Stat label/title */
  label: string;
  /** Main value to display */
  value: string | number;
  /** Unit for the value */
  unit?: string;
  /** Icon component */
  icon?: React.ReactNode;
  /** Trend direction */
  trend?: 'up' | 'down' | 'neutral';
  /** Trend percentage change */
  trendValue?: number;
  /** Trend comparison period */
  trendPeriod?: string;
  /** Color accent (uses CSS variable) */
  accent?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Click handler for showing details */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether currently loading */
  loading?: boolean;
}

const sizeClasses = {
  sm: {
    container: 'p-3',
    icon: 'w-8 h-8',
    label: 'text-xs',
    value: 'text-lg',
    unit: 'text-xs',
    trend: 'text-xs',
  },
  md: {
    container: 'p-4',
    icon: 'w-10 h-10',
    label: 'text-sm',
    value: 'text-2xl',
    unit: 'text-sm',
    trend: 'text-xs',
  },
  lg: {
    container: 'p-6',
    icon: 'w-12 h-12',
    label: 'text-base',
    value: 'text-3xl',
    unit: 'text-base',
    trend: 'text-sm',
  },
};

const accentClasses = {
  primary: 'text-primary bg-primary/10',
  secondary: 'text-secondary bg-secondary/10',
  accent: 'text-accent bg-accent/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  error: 'text-error bg-error/10',
};

const trendColors = {
  up: 'text-success',
  down: 'text-error',
  neutral: 'text-muted',
};

/**
 * StatTile component for displaying key metrics with trends.
 *
 * @example
 * ```tsx
 * <StatTile
 *   label="Total Distance"
 *   value="12,500"
 *   unit="m"
 *   icon={<Waves />}
 *   trend="up"
 *   trendValue={15}
 *   trendPeriod="vs. last week"
 *   onClick={() => openDetailModal()}
 * />
 * ```
 */
export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  unit,
  icon,
  trend,
  trendValue,
  trendPeriod,
  accent = 'primary',
  size = 'md',
  onClick,
  className,
  loading = false,
}) => {
  const sizes = sizeClasses[size];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <motion.div
      className={clsx(
        'stat-tile',
        sizes.container,
        onClick && 'cursor-pointer',
        className
      )}
      whileHover={onClick ? { scale: 1.02, y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Icon */}
      {icon && (
        <div
          className={clsx(
            'flex items-center justify-center rounded-xl mb-3',
            sizes.icon,
            accentClasses[accent]
          )}
        >
          {icon}
        </div>
      )}

      {/* Label */}
      <p className={clsx('text-muted font-medium mb-1', sizes.label)}>{label}</p>

      {/* Value */}
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 bg-surface-hover rounded animate-pulse" />
        </div>
      ) : (
        <div className="flex items-baseline gap-1">
          <span className={clsx('font-bold text-foreground', sizes.value)}>{value}</span>
          {unit && <span className={clsx('text-muted', sizes.unit)}>{unit}</span>}
        </div>
      )}

      {/* Trend */}
      {trend && trendValue !== undefined && (
        <div className={clsx('flex items-center gap-1 mt-2', sizes.trend, trendColors[trend])}>
          <TrendIcon className="w-3 h-3" />
          <span className="font-medium">
            {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
            {Math.abs(trendValue)}%
          </span>
          {trendPeriod && <span className="text-muted ml-1">{trendPeriod}</span>}
        </div>
      )}

      {/* Click hint */}
      {onClick && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs text-muted">Details →</span>
        </div>
      )}
    </motion.div>
  );
};

export default StatTile;
