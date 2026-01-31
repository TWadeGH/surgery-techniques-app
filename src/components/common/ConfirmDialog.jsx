/**
 * ConfirmDialog Component
 * Reusable confirmation dialog for destructive actions
 * 
 * Replaces confirm() calls with accessible, styled dialogs
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

/**
 * ConfirmDialog Component
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dialog is open
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Confirmation message
 * @param {string} props.confirmText - Text for confirm button (default: "Confirm")
 * @param {string} props.cancelText - Text for cancel button (default: "Cancel")
 * @param {string} props.variant - Variant: "danger" | "warning" | "info" (default: "danger")
 * @param {Function} props.onConfirm - Callback when confirmed
 * @param {Function} props.onCancel - Callback when cancelled
 */
export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      button: 'bg-red-600 hover:bg-red-700 text-white',
      icon: 'text-red-600',
    },
    warning: {
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      icon: 'text-yellow-600',
    },
    info: {
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      icon: 'text-blue-600',
    },
  };

  const styles = variantStyles[variant] || variantStyles.danger;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 ${styles.icon}`}>
            <AlertTriangle size={24} />
          </div>
          <p className="text-gray-700 dark:text-gray-300 flex-1">{message}</p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg transition-colors font-medium ${styles.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
