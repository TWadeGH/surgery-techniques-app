import React from 'react';
import DataTable from '../../common/DataTable';
import { useAdminActivity } from '../../../hooks/useAdminActivity';
import { formatDateTime } from '../../../utils/helpers';

const COLUMNS = [
  { key: 'email', label: 'Admin' },
  { key: 'role', label: 'Role', render: v => v?.replace(/_/g, ' ') || '-' },
  { key: 'specialty', label: 'Specialty' },
  { key: 'subspecialty', label: 'Subspecialty' },
  { key: 'lastLogin', label: 'Last Login', render: v => v ? formatDateTime(v) : 'Never' },
  { key: 'resourcesAdded', label: 'Added (30d)' },
  { key: 'resourcesEdited', label: 'Edited (30d)' },
  { key: 'suggestionsReviewed', label: 'Reviewed (30d)' },
];

export default function AdminActivityPanel({ currentUser }) {
  const { admins, loading } = useAdminActivity({ currentUser });

  if (loading) {
    return (
      <div className="glass rounded-2xl p-16 text-center shadow-lg">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 dark:text-gray-400">Loading activity...</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-lg">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Admin Activity</h3>
      <DataTable columns={COLUMNS} data={admins} defaultSort="lastLogin" defaultAsc={false} emptyMessage="No admin activity data" />
    </div>
  );
}
