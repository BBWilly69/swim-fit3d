/**
 * ProgressBar Component
 *
 * A horizontal progress bar with animated fill and optional segments.
 *
 * @module components/ui/ProgressBar
 */

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export interface ProgressBarProps {
  /** Progress value (0-100) */
  progress: number;
  /** Color variant */
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'gradient';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show percentage label */
  showLabel?: boolean;
  /** Custom label */
  label?: string;
  /** Whether to animate */
  animated?: boolean;
  /** Whether to show striped pattern */
  striped?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const colorClasses = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  gradient: 'bg-gradient-to-r from-primary via-accent to-secondary',
};

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

/**
 * ProgressBar component for linear progress visualization.
 *
 * @example
 * ```tsx
 * <ProgressBar progress={65} showLabel />
 * <ProgressBar progress={80} color="gradient" striped animated />
 * ```
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = 'primary',
  size = 'md',
  showLabel = false,
  label,
  animated = true,
  striped = false,
  className,
}) => {
  const normalizedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={clsx('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between mb-1">
          <span className="text-sm text-muted">{label}</span>
          {showLabel && (
            <span className="text-sm font-medium text-foreground">
              {Math.round(normalizedProgress)}%
            </span>
          )}
        </div>
      )}
      <div
        className={clsx(
          'w-full bg-surface-hover rounded-full overflow-hidden',
          sizeClasses[size]
        )}
      >
        <motion.div
          className={clsx(
            'h-full rounded-full',
            colorClasses[color],
            striped && 'bg-stripes animate-stripe'
          )}
          initial={animated ? { width: 0 } : { width: `${normalizedProgress}%` }}
          animate={{ width: `${normalizedProgress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
