/**
 * ProgressRing Component
 *
 * A circular progress indicator with animated fill.
 *
 * @module components/ui/ProgressRing
 */

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export interface ProgressRingProps {
  /** Progress value (0-100) */
  progress: number;
  /** Ring size in pixels */
  size?: number;
  /** Ring stroke width */
  strokeWidth?: number;
  /** Color variant */
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  /** Whether to show percentage text */
  showValue?: boolean;
  /** Custom label instead of percentage */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

const colorClasses = {
  primary: 'stroke-primary',
  secondary: 'stroke-secondary',
  accent: 'stroke-accent',
  success: 'stroke-success',
  warning: 'stroke-warning',
  error: 'stroke-error',
};

/**
 * ProgressRing component for circular progress visualization.
 *
 * @example
 * ```tsx
 * <ProgressRing progress={75} showValue />
 * <ProgressRing progress={50} label="50/100" color="success" />
 * ```
 */
export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 80,
  strokeWidth = 6,
  color = 'primary',
  showValue = false,
  label,
  className,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-surface-hover fill-none"
        />
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={clsx('fill-none', colorClasses[color])}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      {/* Center text */}
      {(showValue || label) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-foreground">
            {label ?? `${Math.round(normalizedProgress)}%`}
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressRing;
