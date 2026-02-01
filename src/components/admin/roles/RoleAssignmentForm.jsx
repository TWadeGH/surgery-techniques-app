import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { USER_ROLES } from '../../../utils/constants';

const ASSIGNABLE_ROLES = [
  { value: USER_ROLES.SPECIALTY_ADMIN, label: 'Specialty Admin' },
  { value: USER_ROLES.SUBSPECIALTY_ADMIN, label: 'Subspecialty Admin' },
];

export default function RoleAssignmentForm({ onSearch, searchResults, searching, onAssign }) {
  const [email, setEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [role, setRole] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [subspecialtyId, setSubspecialtyId] = useState('');
  const [specialties, setSpecialties] = useState([]);
  const [subspecialties, setSubspecialties] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.from('specialties').select('id, name').order('name').then(({ data }) => {
      if (!cancelled) setSpecialties(data || []);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!specialtyId) {
      Promise.resolve().then(() => { if (!cancelled) setSubspecialties([]); });
      return () => { cancelled = true; };
    }
    supabase.from('subspecialties').select('id, name').eq('specialty_id', specialtyId).order('name')
      .then(({ data }) => { if (!cancelled) setSubspecialties(data || []); });
    return () => { cancelled = true; };
  }, [specialtyId]);

  function handleEmailChange(e) {
    const val = e.target.value;
    setEmail(val);
    setSelectedUser(null);
    onSearch(val);
  }

  function selectUser(user) {
    setSelectedUser(user);
    setEmail(user.email);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedUser || !role) return;
    setSubmitting(true);
    const result = await onAssign(selectedUser.id, role, specialtyId || null, subspecialtyId || null);
    setSubmitting(false);
    if (result.success) {
      setEmail('');
      setSelectedUser(null);
      setRole('');
      setSpecialtyId('');
      setSubspecialtyId('');
    }
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-lg">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Assign Role</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email search */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search by email</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={email}
              onChange={handleEmailChange}
              placeholder="user@example.com"
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          {!selectedUser && searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 max-h-40 overflow-y-auto">
              {searchResults.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => selectUser(u)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                >
                  {u.email} <span className="text-gray-400">({u.role})</span>
                </button>
              ))}
            </div>
          )}
          {searching && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
        </div>

        {selectedUser && (
          <>
            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Select role</option>
                {ASSIGNABLE_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Specialty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specialty</label>
              <select
                value={specialtyId}
                onChange={e => { setSpecialtyId(e.target.value); setSubspecialtyId(''); }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Select specialty</option>
                {specialties.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Subspecialty */}
            {role === USER_ROLES.SUBSPECIALTY_ADMIN && subspecialties.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subspecialty</label>
                <select
                  value={subspecialtyId}
                  onChange={e => setSubspecialtyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Select subspecialty</option>
                  {subspecialties.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={!role || submitting}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {submitting ? 'Assigning...' : 'Assign Role'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
