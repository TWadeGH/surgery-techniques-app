/**
 * Common Components Index
 * Export all common components from a single location for easier imports
 * 
 * Usage:
 * import { Button, Modal, Spinner, Input } from './components/common';
 */

export { default as Button, VARIANTS as BUTTON_VARIANTS, SIZES as BUTTON_SIZES } from './Button';
export { default as Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
export { 
  default as Spinner, 
  FullPageSpinner, 
  InlineSpinner, 
  LoadingSkeleton, 
  CardSkeleton 
} from './Spinner';
export { default as ErrorBoundary, ComponentErrorBoundary } from './ErrorBoundary';
export { default as Input, Textarea, Select } from './Input';
export { ToastProvider, useToast } from './Toast';
export { default as ConfirmDialog } from './ConfirmDialog';