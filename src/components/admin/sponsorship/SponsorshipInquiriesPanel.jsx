import React, { useState } from 'react';
import DataTable from '../../common/DataTable';
import InquiryDetailModal from './InquiryDetailModal';
import { useSponsorshipInquiries } from '../../../hooks/useSponsorshipInquiries';
import { formatDateTime } from '../../../utils/helpers';

const STATUS_BADGE = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  closed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

export default function SponsorshipInquiriesPanel({ currentUser }) {
  const { inquiries, loading, updateStatus } = useSponsorshipInquiries({ currentUser });
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = statusFilter === 'all' ? inquiries : inquiries.filter(i => i.status === statusFilter);

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'status',
      label: 'Status',
      render: v => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[v] || ''}`}>
          {v}
        </span>
      ),
    },
    { key: 'created_at', label: 'Submitted', render: v => formatDateTime(v) },
    {
      key: 'actions',
      label: '',
      sortable: false,
      render: (_, row) => (
        <button
          onClick={() => setSelectedInquiry(row)}
          className="text-purple-600 hover:text-purple-800 text-sm font-medium"
        >
          View
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="glass rounded-2xl p-16 text-center shadow-lg">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 dark:text-gray-400">Loading inquiries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex gap-2">
        {['all', 'new', 'contacted', 'closed'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              statusFilter === s
                ? 'bg-purple-600 text-white shadow'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            {s === 'new' && inquiries.filter(i => i.status === 'new').length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {inquiries.filter(i => i.status === 'new').length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Partnership Inquiries</h3>
        <DataTable columns={columns} data={filtered} defaultSort="created_at" defaultAsc={false} emptyMessage="No inquiries" />
      </div>

      {selectedInquiry && (
        <InquiryDetailModal
          inquiry={selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
          onUpdateStatus={updateStatus}
        />
      )}
    </div>
  );
}
