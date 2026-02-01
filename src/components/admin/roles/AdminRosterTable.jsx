import React from 'react';
import DataTable from '../../common/DataTable';
import { UserMinus } from 'lucide-react';

export default function AdminRosterTable({ admins, onRevoke, currentUserId }) {
  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: v => v?.replace(/_/g, ' ') || '-' },
    { key: 'specialty', label: 'Specialty' },
    { key: 'subspecialty', label: 'Subspecialty' },
    {
      key: 'actions',
      label: '',
      sortable: false,
      render: (_, row) =>
        row.id !== currentUserId ? (
          <button
            onClick={() => onRevoke(row.id)}
            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Demote to user"
          >
            <UserMinus size={16} />
          </button>
        ) : null,
    },
  ];

  return (
    <div className="glass rounded-2xl p-6 shadow-lg">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Current Admins</h3>
      <DataTable columns={columns} data={admins} defaultSort="role" emptyMessage="No admins found" />
    </div>
  );
}
