/**
 * CompanyHistoryModal Component
 *
 * Modal for viewing inquiry history and stats for a company.
 */

import React, { useState, useEffect, memo, useMemo } from 'react';
import { X, MessageSquare, Calendar, User, MapPin, Package, CheckCircle, Clock, Archive } from 'lucide-react';
import { useSubspecialtyCompanies } from '../../../hooks/useSubspecialtyCompanies';
import { INQUIRY_STATUSES } from '../../../utils/constants';

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Get status badge styles
 */
function getStatusBadge(status) {
  switch (status) {
    case INQUIRY_STATUSES.NEW:
      return {
        icon: <Clock size={12} />,
        label: 'New',
        className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
      };
    case INQUIRY_STATUSES.IN_PROGRESS:
      return {
        icon: <Clock size={12} />,
        label: 'In Progress',
        className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      };
    case INQUIRY_STATUSES.COMPLETED:
      return {
        icon: <CheckCircle size={12} />,
        label: 'Completed',
        className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      };
    case INQUIRY_STATUSES.DISMISSED:
      return {
        icon: <Archive size={12} />,
        label: 'Dismissed',
        className: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
      };
    default:
      return {
        icon: null,
        label: status || 'Unknown',
        className: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
      };
  }
}

/**
 * CompanyHistoryModal Component
 *
 * @param {Object} props
 * @param {Object} props.company - Company object
 * @param {Function} props.onClose - Callback when modal closes
 */
function CompanyHistoryModal({ company, onClose }) {
  const { getCompanyInquiries } = useSubspecialtyCompanies();

  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load inquiries on mount
  useEffect(() => {
    loadInquiries();
  }, [company.id]);

  const loadInquiries = async () => {
    setLoading(true);
    const result = await getCompanyInquiries(company.id);
    if (result.success) {
      setInquiries(result.data);
    }
    setLoading(false);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const counts = {
      total: inquiries.length,
      new: 0,
      in_progress: 0,
      completed: 0,
      dismissed: 0
    };

    inquiries.forEach(inquiry => {
      if (counts[inquiry.status] !== undefined) {
        counts[inquiry.status]++;
      }
    });

    return counts;
  }, [inquiries]);

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
          aria-labelledby="history-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 id="history-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                {company.company_name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Inquiry History
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
          <div className="p-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-300">Loading...</span>
              </div>
            ) : (
              <>
                {/* Stats Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                  </div>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-center">
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.new}</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">New</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.in_progress}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">In Progress</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.completed}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">Completed</p>
                  </div>
                </div>

                {/* Inquiries List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {inquiries.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No inquiries yet</p>
                      <p className="text-sm">Inquiries will appear here when users contact this company.</p>
                    </div>
                  ) : (
                    inquiries.map((inquiry) => {
                      const statusBadge = getStatusBadge(inquiry.status);
                      return (
                        <div
                          key={inquiry.id}
                          className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                        >
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                                {statusBadge.icon}
                                {statusBadge.label}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(inquiry.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            {inquiry.user_name && (
                              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <User size={14} className="text-gray-400" />
                                <span>{inquiry.user_name}</span>
                              </div>
                            )}
                            {inquiry.user_location && (
                              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <MapPin size={14} className="text-gray-400" />
                                <span>{inquiry.user_location}</span>
                              </div>
                            )}
                            {inquiry.product_name && (
                              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 sm:col-span-2">
                                <Package size={14} className="text-gray-400" />
                                <span>{inquiry.product_name}</span>
                              </div>
                            )}
                          </div>

                          {/* Message preview */}
                          {inquiry.message && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {inquiry.message}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
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

export default memo(CompanyHistoryModal);
