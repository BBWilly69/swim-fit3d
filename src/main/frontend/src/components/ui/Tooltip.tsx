/**
 * Tooltip Component
 *
 * A tooltip that appears on hover with configurable positioning.
 *
 * @module components/ui/Tooltip
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export interface TooltipProps {
  /** Tooltip content */
  content: React.ReactNode;
  /** Element that triggers the tooltip */
  children: React.ReactNode;
  /** Position relative to trigger */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay before showing (ms) */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
}

const positionClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const arrowClasses = {
  top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45',
  bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45',
  left: 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rotate-45',
  right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 rotate-45',
};

/**
 * Tooltip component for contextual information.
 *
 * @example
 * ```tsx
 * <Tooltip content="Average time per 100 meters">
 *   <span className="text-muted">?</span>
 * </Tooltip>
 * ```
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={clsx(
              'absolute z-50 px-3 py-2 text-sm rounded-lg',
              'bg-surface border border-border shadow-lg',
              'whitespace-nowrap',
              positionClasses[position],
              className
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
          >
            {content}
            <div
              className={clsx(
                'absolute w-2 h-2 bg-surface border-l border-t border-border',
                arrowClasses[position]
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;
