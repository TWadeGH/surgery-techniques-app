/**
 * Modal Component
 * Reusable modal with proper accessibility and animations
 * 
 * Production-grade modal with focus management and ESC key handling
 */

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Modal Component
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Callback when modal closes
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} props.title - Modal title
 * @param {string} props.size - Modal size (sm, md, lg, xl, full)
 * @param {boolean} props.showCloseButton - Whether to show close button
 * @param {boolean} props.closeOnOverlayClick - Whether clicking overlay closes modal
 * @param {boolean} props.closeOnEsc - Whether ESC key closes modal
 * @param {string} props.className - Additional CSS classes for modal content
 */
export default function Modal({
  isOpen = false,
  onClose,
  children,
  title = '',
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  className = '',
}) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    function handleEscape(e) {
      if (e.key === 'Escape') {
        onClose?.();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEsc, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Save currently focused element
      previousFocusRef.current = document.activeElement;
      
      // Focus modal
      modalRef.current?.focus();
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore focus
      previousFocusRef.current?.focus();
      
      // Restore body scroll
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle overlay click
  function handleOverlayClick(e) {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose?.();
    }
  }

  // Get size classes
  function getSizeClasses() {
    const sizes = {
      sm: 'max-w-md',
      md: 'max-w-2xl',
      lg: 'max-w-4xl',
      xl: 'max-w-6xl',
      full: 'max-w-[95vw]',
    };
    return sizes[size] || sizes.md;
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${getSizeClasses()} max-h-[90vh] overflow-hidden animate-slide-up ${className}`}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            {title && (
              <h2
                id="modal-title"
                className="text-2xl font-bold text-gray-900 dark:text-white"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * ModalHeader Component
 * Optional header component for modal content
 */
export function ModalHeader({ children, className = '' }) {
  return (
    <div className={`px-6 pt-6 ${className}`}>
      {children}
    </div>
  );
}

/**
 * ModalBody Component
 * Content area of the modal
 */
export function ModalBody({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * ModalFooter Component
 * Footer with action buttons
 */
export function ModalFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 ${className}`}>
      {children}
    </div>
  );
}
