/**
 * RepInquiriesList Component
 *
 * Displays a list of inquiries for the rep platform.
 */

import React, { memo } from 'react';
import { User, MapPin, Package, Clock, CheckCircle, Archive, MessageSquare, Calendar } from 'lucide-react';
import { INQUIRY_STATUSES } from '../../utils/constants';

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
}

/**
 * Get status badge config
 */
function getStatusConfig(status) {
  switch (status) {
    case INQUIRY_STATUSES.NEW:
      return {
        icon: <Clock size={14} />,
        label: 'New',
        className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
        dotColor: 'bg-yellow-500'
      };
    case INQUIRY_STATUSES.IN_PROGRESS:
      return {
        icon: <Clock size={14} />,
        label: 'In Progress',
        className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        dotColor: 'bg-blue-500'
      };
    case INQUIRY_STATUSES.COMPLETED:
      return {
        icon: <CheckCircle size={14} />,
        label: 'Done',
        className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        dotColor: 'bg-green-500'
      };
    case INQUIRY_STATUSES.DISMISSED:
      return {
        icon: <Archive size={14} />,
        label: 'Dismissed',
        className: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
        dotColor: 'bg-gray-400'
      };
    default:
      return {
        icon: null,
        label: status || 'Unknown',
        className: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
        dotColor: 'bg-gray-400'
      };
  }
}

/**
 * RepInquiriesList Component
 *
 * @param {Object} props
 * @param {Array} props.inquiries - Array of inquiry objects
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onInquiryClick - Callback when inquiry is clicked
 * @param {Function} props.onStatusChange - Callback for quick status change
 */
function RepInquiriesList({
  inquiries = [],
  loading = false,
  onInquiryClick,
  onStatusChange
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-300">Loading inquiries...</span>
      </div>
    );
  }

  if (inquiries.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-600 dark:text-gray-400 text-lg">No inquiries yet</p>
        <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
          Inquiries will appear here when surgeons contact you about products.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
              Status
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
              Surgeon
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-200 hidden sm:table-cell">
              Location
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
              Product
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {inquiries.map((inquiry) => {
            const statusConfig = getStatusConfig(inquiry.status);

            return (
              <tr
                key={inquiry.id}
                onClick={() => onInquiryClick?.(inquiry)}
                className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
              >
                {/* Status */}
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
                    <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`}></span>
                    {statusConfig.label}
                  </span>
                </td>

                {/* Surgeon */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {inquiry.user_name || 'Unknown'}
                    </span>
                  </div>
                </td>

                {/* Location */}
                <td className="py-4 px-4 hidden sm:table-cell">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <MapPin size={16} className="text-gray-400" />
                    <span>{inquiry.user_location || '-'}</span>
                  </div>
                </td>

                {/* Product */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Package size={16} className="text-gray-400" />
                    <span className="truncate max-w-[150px]">
                      {inquiry.productName || inquiry.product_name || '-'}
                    </span>
                  </div>
                </td>

                {/* Date */}
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <Calendar size={14} />
                    <span>{formatDate(inquiry.created_at)}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default memo(RepInquiriesList);
