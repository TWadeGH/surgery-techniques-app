/**
 * ExternalLinkModal — DMCA-safe confirmation before leaving to third-party content.
 * Shows legal disclaimer; tracks click only after user clicks Continue.
 */

import { X } from 'lucide-react';
import { EXTERNAL_LINK_DISCLOSURE } from '../../utils/constants';

export default function ExternalLinkModal({ isOpen, onClose, onContinue, resourceTitle, sourceLabel }) {
  if (!isOpen) return null;

  const handleContinue = () => {
    onContinue?.();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="external-link-title">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl border border-gray-200 dark:border-gray-700 animate-scale-in-modal">
        <div className="flex items-center justify-between mb-4">
          <h2 id="external-link-title" className="text-lg font-bold text-gray-900 dark:text-white">
            {EXTERNAL_LINK_DISCLOSURE.MODAL_TITLE}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            aria-label="Cancel"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {EXTERNAL_LINK_DISCLOSURE.MODAL_BODY}
        </p>
        {resourceTitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Destination: {resourceTitle}
            {sourceLabel && ` · ${sourceLabel}`}
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
          {EXTERNAL_LINK_DISCLOSURE.CARD_DISCLAIMER} {EXTERNAL_LINK_DISCLOSURE.COPYRIGHT_REPORT}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
