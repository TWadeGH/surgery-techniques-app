/**
 * Modal that requires the user to accept Terms and Conditions.
 * No close button or escape — user must click "I Accept" to proceed.
 * Used after onboarding and for returning users who haven't accepted yet.
 */

import React, { useState } from 'react';
import Modal from '../common/Modal';
import { TermsContent } from './LegalContent';

export default function TermsAcceptanceModal({ isOpen, onAccept, onBack, onDecline, loading = false }) {
  const [accepting, setAccepting] = useState(false);
  const busy = loading || accepting;

  async function handleAccept() {
    if (busy) return;
    setAccepting(true);
    try {
      await onAccept?.();
    } finally {
      setAccepting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={true}
      onClose={() => {}}
      title="Terms and Conditions"
      size="xl"
      showCloseButton={false}
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <TermsContent />
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
          )}
          {onDecline && (
            <button
              type="button"
              onClick={onDecline}
              disabled={busy}
              className="px-4 py-3 border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Decline
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            By clicking &quot;I Accept&quot;, you agree to be bound by these Terms and Conditions.
          </p>
          <button
            type="button"
            onClick={handleAccept}
            disabled={busy}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? 'Saving...' : 'I Accept'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
