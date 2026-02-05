/**
 * Modal Component
 *
 * A dialog overlay with glassmorphic styling and animations.
 * Uses Headless UI for accessibility.
 *
 * @module components/ui/Modal
 */

import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import clsx from 'clsx';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal subtitle/description */
  subtitle?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Footer content */
  footer?: React.ReactNode;
  /** Additional CSS classes for the panel */
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

/**
 * Modal component with glassmorphic styling and smooth animations.
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={showDetails}
 *   onClose={() => setShowDetails(false)}
 *   title="Activity Details"
 *   subtitle="Full breakdown of your swim session"
 * >
 *   <ActivityDetails activity={selectedActivity} />
 * </Modal>
 * ```
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  showCloseButton = true,
  footer,
  className,
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="modal-overlay" />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={clsx(
                  'w-full transform overflow-hidden rounded-2xl',
                  'glass-card p-6 text-left align-middle shadow-xl',
                  'transition-all',
                  sizeClasses[size],
                  className
                )}
              >
                {/* Header */}
                {(title || showCloseButton) && (
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      {title && (
                        <Dialog.Title
                          as="h3"
                          className="text-lg font-semibold text-foreground"
                        >
                          {title}
                        </Dialog.Title>
                      )}
                      {subtitle && (
                        <p className="mt-1 text-sm text-muted">{subtitle}</p>
                      )}
                    </div>
                    {showCloseButton && (
                      <motion.button
                        className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                        onClick={onClose}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X className="w-5 h-5" />
                      </motion.button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="mt-2">{children}</div>

                {/* Footer */}
                {footer && (
                  <div className="mt-6 flex justify-end gap-3">{footer}</div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default Modal;
