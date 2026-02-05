/**
 * GlassCard Component
 *
 * A glassmorphic card container with blur effect and subtle borders.
 * Supports hover animations and click interactions.
 *
 * @module components/ui/GlassCard
 */

import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';

export interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** Card content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether the card is clickable/interactive */
  interactive?: boolean;
  /** Hover scale factor (default: 1.02) */
  hoverScale?: number;
  /** Whether to show a glow effect */
  glow?: boolean;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Border radius size */
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Card variant */
  variant?: 'default' | 'elevated' | 'outlined' | 'solid';
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4 md:p-6',
  lg: 'p-6 md:p-8',
};

const roundedClasses = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
  full: 'rounded-full',
};

const variantClasses = {
  default: 'glass-card',
  elevated: 'glass-card shadow-xl',
  outlined: 'glass-card ring-2 ring-primary/30',
  solid: 'bg-surface shadow-lg',
};

/**
 * GlassCard component with glassmorphic styling and optional animations.
 *
 * @example
 * ```tsx
 * <GlassCard interactive onClick={() => console.log('clicked')}>
 *   <h2>Card Title</h2>
 *   <p>Card content goes here</p>
 * </GlassCard>
 * ```
 */
export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      children,
      className,
      interactive = false,
      hoverScale = 1.02,
      glow = false,
      padding = 'md',
      rounded = 'xl',
      variant = 'default',
      ...motionProps
    },
    ref
  ) => {
    const baseClasses = clsx(
      variantClasses[variant],
      paddingClasses[padding],
      roundedClasses[rounded],
      interactive && 'cursor-pointer',
      glow && 'animate-pulseGlow',
      className
    );

    return (
      <motion.div
        ref={ref}
        className={baseClasses}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={interactive ? { scale: hoverScale, y: -2 } : undefined}
        whileTap={interactive ? { scale: 0.98 } : undefined}
        {...motionProps}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
