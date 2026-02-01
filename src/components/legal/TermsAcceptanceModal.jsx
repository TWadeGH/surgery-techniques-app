/**
 * Modal that requires the user to accept Terms and Conditions.
 * No close button or escape — user must click "I Accept" to proceed.
 * Used after onboarding and for returning users who haven't accepted yet.
 */

import React, { useState } from 'react';
import Modal from '../common/Modal';
import { TermsContent } from './LegalContent';

export default function TermsAcceptanceModal({ isOpen, onAccept, loading = false }) {
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
    </Modal>
  );
}
