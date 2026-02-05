/**
 * Badge Component
 *
 * A small status/label indicator with various variants.
 *
 * @module components/ui/Badge
 */

import React from 'react';
import clsx from 'clsx';

export interface BadgeProps {
  /** Badge content */
  children: React.ReactNode;
  /** Visual variant */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'gold' | 'silver' | 'bronze';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to use pill shape */
  pill?: boolean;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const variantClasses = {
  default: 'bg-surface-hover text-muted',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  error: 'bg-error/20 text-error',
  info: 'bg-primary/20 text-primary',
  gold: 'badge-gold',
  silver: 'badge-silver',
  bronze: 'badge-bronze',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

/**
 * Badge component for status and label indicators.
 *
 * @example
 * ```tsx
 * <Badge variant="gold" icon={<Trophy />}>Personal Best</Badge>
 * <Badge variant="success">Imported</Badge>
 * ```
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  pill = true,
  icon,
  className,
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 font-medium',
        variantClasses[variant],
        sizeClasses[size],
        pill ? 'rounded-full' : 'rounded-md',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
