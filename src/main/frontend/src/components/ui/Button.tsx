/**
 * Button Component
 *
 * A versatile button with multiple variants, sizes, and states.
 *
 * @module components/ui/Button
 */

import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  /** Button content */
  children: React.ReactNode;
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Icon to show before text */
  icon?: React.ReactNode;
  /** Icon to show after text */
  iconAfter?: React.ReactNode;
  /** Whether the button is in loading state */
  loading?: boolean;
  /** Whether the button takes full width */
  fullWidth?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const variantClasses = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  accent: 'btn-accent',
  ghost: 'btn-ghost',
  danger: 'bg-error text-white hover:bg-error/90 focus:ring-error/50',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

/**
 * Button component with animations and multiple variants.
 *
 * @example
 * ```tsx
 * <Button variant="primary" icon={<Upload />}>
 *   Import Files
 * </Button>
 *
 * <Button variant="ghost" loading>
 *   Processing...
 * </Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      icon,
      iconAfter,
      loading = false,
      fullWidth = false,
      className,
      disabled,
      ...motionProps
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center gap-2 font-medium rounded-xl',
          'transition-all duration-200 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          isDisabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        disabled={isDisabled}
        whileHover={!isDisabled ? { scale: 1.02 } : undefined}
        whileTap={!isDisabled ? { scale: 0.98 } : undefined}
        {...motionProps}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          icon && <span className="flex-shrink-0">{icon}</span>
        )}
        {children}
        {iconAfter && !loading && <span className="flex-shrink-0">{iconAfter}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
