import React from 'react';
import { useRoleManagement } from '../../../hooks/useRoleManagement';
import AdminRosterTable from './AdminRosterTable';
import RoleAssignmentForm from './RoleAssignmentForm';

export default function RoleManagementPanel({ currentUser }) {
  const { admins, loading, searchUsers, searchResults, searching, assignRole, revokeRole } = useRoleManagement({ currentUser });

  if (loading) {
    return (
      <div className="glass rounded-2xl p-16 text-center shadow-lg">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 dark:text-gray-400">Loading roles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RoleAssignmentForm
        onSearch={searchUsers}
        searchResults={searchResults}
        searching={searching}
        onAssign={assignRole}
      />
      <AdminRosterTable admins={admins} onRevoke={revokeRole} currentUserId={currentUser?.id} />
    </div>
  );
}
