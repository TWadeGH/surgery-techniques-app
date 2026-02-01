import React, { useState } from 'react';
import Modal, { ModalBody, ModalFooter } from '../../common/Modal';
import { formatDateTime } from '../../../utils/helpers';
import { INQUIRY_STATUSES } from '../../../utils/constants';

const STATUS_OPTIONS = [
  { value: INQUIRY_STATUSES.NEW, label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: INQUIRY_STATUSES.CONTACTED, label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
  { value: INQUIRY_STATUSES.CLOSED, label: 'Closed', color: 'bg-green-100 text-green-800' },
];

export default function InquiryDetailModal({ inquiry, onClose, onUpdateStatus }) {
  const [status, setStatus] = useState(inquiry?.status || 'new');
  const [adminNotes, setAdminNotes] = useState(inquiry?.admin_notes || '');
  const [saving, setSaving] = useState(false);

  if (!inquiry) return null;

  async function handleSave() {
    setSaving(true);
    await onUpdateStatus(inquiry.id, status, adminNotes);
    setSaving(false);
    onClose();
  }

  return (
    <Modal isOpen={!!inquiry} onClose={onClose} title="Inquiry Detail" size="md">
      <ModalBody>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
              <p className="font-medium text-gray-900 dark:text-white">{inquiry.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
              <p className="font-medium text-gray-900 dark:text-white">{inquiry.email}</p>
            </div>
            {inquiry.phone && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                <p className="font-medium text-gray-900 dark:text-white">{inquiry.phone}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Submitted</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(inquiry.created_at)}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Message</p>
            <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg p-3">{inquiry.message}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    status === opt.value
                      ? opt.color + ' ring-2 ring-offset-1 ring-purple-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin Notes</label>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
