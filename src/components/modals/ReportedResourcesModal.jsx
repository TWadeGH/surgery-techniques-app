/**
 * ReportedResourcesModal Component
 * Admin modal for viewing and managing reported resources (dismiss / mark reviewed).
 * Visible to Super Admin, specialty admin, and subspecialty admin per RLS.
 */

import { useState } from 'react';
import { X, Flag, FileText, ArrowRight, Edit, Trash2 } from 'lucide-react';
import { formatDate } from '../../utils/helpers';

const STATUS_LABELS = { pending: 'Pending', reviewed: 'Reviewed', dismissed: 'Dismissed' };

export default function ReportedResourcesModal({
  reports = [],
  onDismiss,
  onMarkReviewed,
  onEditResource,
  onDeleteResource,
  onClose,
  currentUser,
}) {
  const [actioningId, setActioningId] = useState(null);
  const pendingReports = reports.filter((r) => r.status === 'pending');
  const otherReports = reports.filter((r) => r.status !== 'pending');

  async function handleDismiss(reportId) {
    setActioningId(reportId);
    try {
      await onDismiss(reportId);
    } finally {
      setActioningId(null);
    }
  }

  async function handleMarkReviewed(reportId) {
    setActioningId(reportId);
    try {
      await onMarkReviewed(reportId);
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="reported-resources-title">
      <div className="glass rounded-2xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 id="reported-resources-title" className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Flag size={28} className="text-amber-500" />
              Reported Resources
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {pendingReports.length} pending · {otherReports.length} reviewed/dismissed
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-12">
            <Flag size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">No reported resources</p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...pendingReports, ...otherReports].map((report) => {
              const resource = report.resources;
              const isPending = report.status === 'pending';
              const busy = actioningId === report.id;
              return (
                <div
                  key={report.id}
                  className="glass rounded-xl p-4 sm:p-6 border-2 border-amber-200 dark:border-amber-800"
                >
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    <div className="w-full sm:w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {resource?.image_url ? (
                        <img
                          src={resource.image_url}
                          alt={resource.title || 'Resource'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText size={32} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                          {STATUS_LABELS[report.status] || report.status}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(report.created_at)}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {resource?.title || 'Unknown resource'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 whitespace-pre-wrap">
                        {report.report_text}
                      </p>
                      {resource?.url && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-700 text-sm break-all flex items-center gap-1 mb-3"
                        >
                          <span>{resource.url}</span>
                          <ArrowRight size={14} />
                        </a>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">Reported by a user</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleMarkReviewed(report.id)}
                              disabled={busy}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium text-sm"
                            >
                              {busy ? 'Updating…' : 'Mark Reviewed'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDismiss(report.id)}
                              disabled={busy}
                              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors font-medium text-sm"
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                        {onEditResource && resource?.id && (
                          <button
                            type="button"
                            onClick={() => {
                              onEditResource(resource);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors font-medium text-sm"
                          >
                            <Edit size={16} />
                            Edit
                          </button>
                        )}
                        {onDeleteResource && resource?.id && (
                          <button
                            type="button"
                            onClick={() => onDeleteResource(resource.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-red-600 text-red-600 dark:border-red-400 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium text-sm"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
