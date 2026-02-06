/**
 * InquiryDetailModal Component
 *
 * Modal for viewing and responding to a single inquiry.
 */

import React, { useState, useEffect, memo } from 'react';
import { X, User, Mail, MapPin, Package, Calendar, Clock, CheckCircle, Archive, ExternalLink, Save } from 'lucide-react';
import { INQUIRY_STATUSES } from '../../utils/constants';
import { useToast } from '../common';

/**
 * Format date for display
 */
function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get status config
 */
function getStatusConfig(status) {
  switch (status) {
    case INQUIRY_STATUSES.NEW:
      return {
        icon: <Clock size={16} />,
        label: 'New',
        className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
      };
    case INQUIRY_STATUSES.IN_PROGRESS:
      return {
        icon: <Clock size={16} />,
        label: 'In Progress',
        className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      };
    case INQUIRY_STATUSES.COMPLETED:
      return {
        icon: <CheckCircle size={16} />,
        label: 'Completed',
        className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
      };
    case INQUIRY_STATUSES.DISMISSED:
      return {
        icon: <Archive size={16} />,
        label: 'Dismissed',
        className: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
      };
    default:
      return {
        icon: null,
        label: status || 'Unknown',
        className: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
      };
  }
}

/**
 * InquiryDetailModal Component
 *
 * @param {Object} props
 * @param {Object} props.inquiry - Inquiry object
 * @param {Function} props.onClose - Callback when modal closes
 * @param {Function} props.onStatusChange - Callback when status changes
 * @param {Function} props.onNotesChange - Callback when notes change
 */
function InquiryDetailModal({
  inquiry,
  onClose,
  onStatusChange,
  onNotesChange
}) {
  const toast = useToast();
  const [notes, setNotes] = useState(inquiry.rep_notes || '');
  const [saving, setSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(inquiry.status);

  const statusConfig = getStatusConfig(currentStatus);

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    setCurrentStatus(newStatus);
    if (onStatusChange) {
      const result = await onStatusChange(inquiry.id, newStatus);
      if (result?.success === false) {
        setCurrentStatus(inquiry.status); // Revert on error
        toast.error('Failed to update status');
      } else {
        toast.success('Status updated');
      }
    }
  };

  // Handle notes save
  const handleSaveNotes = async () => {
    setSaving(true);
    if (onNotesChange) {
      const result = await onNotesChange(inquiry.id, notes);
      if (result?.success === false) {
        toast.error('Failed to save notes');
      } else {
        toast.success('Notes saved');
      }
    }
    setSaving(false);
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inquiry-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 id="inquiry-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                Inquiry Details
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDateTime(inquiry.created_at)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.values(INQUIRY_STATUSES).map((status) => {
                  const config = getStatusConfig(status);
                  const isSelected = currentStatus === status;

                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        isSelected
                          ? config.className + ' border-current'
                          : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      {config.icon}
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Surgeon Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                  <User size={14} />
                  <span>Surgeon</span>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {inquiry.user_name || 'Unknown'}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                  <Mail size={14} />
                  <span>Email</span>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {inquiry.user_email || '-'}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                  <MapPin size={14} />
                  <span>Location</span>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {inquiry.user_location || '-'}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                  <Package size={14} />
                  <span>Product</span>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {inquiry.productName || inquiry.product_name || '-'}
                </p>
              </div>
            </div>

            {/* Resource Link */}
            {inquiry.resourceUrl && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 dark:text-purple-300 font-medium mb-1">
                      Related Resource
                    </p>
                    <p className="text-gray-900 dark:text-white">
                      {inquiry.resourceTitle || 'View Resource'}
                    </p>
                  </div>
                  <a
                    href={inquiry.resourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                  >
                    <ExternalLink size={14} />
                    Open
                  </a>
                </div>
              </div>
            )}

            {/* Message */}
            {inquiry.message && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message from Surgeon
                </label>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                    {inquiry.message}
                  </p>
                </div>
              </div>
            )}

            {/* Rep Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add private notes about this inquiry..."
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSaveNotes}
                  disabled={saving || notes === (inquiry.rep_notes || '')}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Save Notes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(InquiryDetailModal);
