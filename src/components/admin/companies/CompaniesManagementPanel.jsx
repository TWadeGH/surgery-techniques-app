/**
 * CompaniesManagementPanel Component
 *
 * Admin panel for managing subspecialty companies and their contacts.
 * Shows company list with contact counts, active status, and actions.
 */

import React, { useState, useMemo, memo, useRef, useEffect } from 'react';
import { Users, BarChart3, Search, Building2, CheckCircle, Circle, Plus, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { useSubspecialtyCompanies } from '../../../hooks/useSubspecialtyCompanies';
import { useToast } from '../../common';
import CompanyContactsModal from './CompanyContactsModal';
import CompanyHistoryModal from './CompanyHistoryModal';

/**
 * CompaniesManagementPanel Component
 *
 * @param {Object} props
 * @param {Object} props.currentUser - Current user object
 * @param {string} props.subspecialtyId - Filter by subspecialty (optional)
 * @param {Array} props.availableSubspecialties - List of subspecialties for dropdown
 * @param {Function} props.onSubspecialtyChange - Callback when subspecialty filter changes
 */
function CompaniesManagementPanel({
  currentUser,
  subspecialtyId,
  availableSubspecialties = [],
  onSubspecialtyChange
}) {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubspecialty, setSelectedSubspecialty] = useState(subspecialtyId || '');
  const [contactsModalCompany, setContactsModalCompany] = useState(null);
  const [historyModalCompany, setHistoryModalCompany] = useState(null);
  const [showAddCompanyForm, setShowAddCompanyForm] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  const {
    companies,
    loading,
    error,
    createCompany,
    updateCompany,
    deleteCompany,
    searchCompanies
  } = useSubspecialtyCompanies(selectedSubspecialty || null);

  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [deletingCompanyId, setDeletingCompanyId] = useState(null);
  const [menuOpenCompanyId, setMenuOpenCompanyId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenCompanyId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter companies by search term
  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) return companies;
    return searchCompanies(searchTerm);
  }, [companies, searchTerm, searchCompanies]);

  // Handle subspecialty filter change
  const handleSubspecialtyChange = (e) => {
    const value = e.target.value;
    setSelectedSubspecialty(value);
    if (onSubspecialtyChange) {
      onSubspecialtyChange(value || null);
    }
  };

  // Handle adding a new company
  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) {
      toast.error('Company name is required');
      return;
    }

    if (!selectedSubspecialty) {
      toast.error('Please select a subspecialty first');
      return;
    }

    const result = await createCompany({
      subspecialty_id: selectedSubspecialty,
      company_name: newCompanyName.trim()
    });

    if (result.success) {
      toast.success('Company created successfully');
      setNewCompanyName('');
      setShowAddCompanyForm(false);
    } else {
      toast.error(result.error || 'Failed to create company');
    }
  };

  const handleStartEdit = (company) => {
    setEditingCompanyId(company.id);
    setEditingName(company.company_name || '');
  };

  const handleCancelEdit = () => {
    setEditingCompanyId(null);
    setEditingName('');
  };

  const handleSaveEdit = async () => {
    if (!editingCompanyId || !editingName.trim()) {
      toast.error('Company name is required');
      return;
    }
    const result = await updateCompany(editingCompanyId, { company_name: editingName.trim() });
    if (result.success) {
      toast.success('Company updated');
      setEditingCompanyId(null);
      setEditingName('');
    } else {
      toast.error(result.error || 'Failed to update company');
    }
  };

  const handleDeleteClick = (company) => {
    setDeletingCompanyId(company.id);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCompanyId) return;
    const result = await deleteCompany(deletingCompanyId);
    setDeletingCompanyId(null);
    if (result.success) {
      toast.success('Company deleted');
    } else {
      toast.error(result.error || 'Failed to delete company');
    }
  };

  const handleCancelDelete = () => {
    setDeletingCompanyId(null);
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading companies...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-2xl p-6 shadow-lg">
        <div className="text-center py-12">
          <p className="text-red-500 dark:text-red-400">Error loading companies: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Companies</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage company contacts for the Contact Rep feature
            </p>
          </div>
        </div>

        {/* Add Company Button */}
        <button
          onClick={() => setShowAddCompanyForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
        >
          <Plus size={16} />
          Add Company
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Subspecialty Filter */}
        <div className="flex-1 max-w-xs">
          <select
            value={selectedSubspecialty}
            onChange={handleSubspecialtyChange}
            className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
          >
            <option value="">All Subspecialties</option>
            {availableSubspecialties.map(sub => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search companies..."
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Add Company Form */}
      {showAddCompanyForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Add New Company</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="Company name (e.g., Stryker, Arthrex)"
              className="flex-1 px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddCompany}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddCompanyForm(false);
                  setNewCompanyName('');
                }}
                className="px-4 py-2 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
          {!selectedSubspecialty && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              Please select a subspecialty to add a company to.
            </p>
          )}
        </div>
      )}

      {/* Companies Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                Company Name
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                Contacts
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                Status
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-500 dark:text-gray-400">
                  {searchTerm
                    ? 'No companies match your search'
                    : selectedSubspecialty
                      ? 'No companies found for this subspecialty. Add resources with company names to auto-populate, or add a company manually.'
                      : 'Select a subspecialty to view companies'}
                </td>
              </tr>
            ) : (
              filteredCompanies.map((company) => (
                <tr
                  key={company.id}
                  className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  {/* Company Name */}
                  <td className="py-4 px-4">
                    {editingCompanyId === company.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          placeholder="Company name"
                          className="flex-1 min-w-[140px] px-3 py-1.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {company.company_name}
                        </p>
                        {company.subspecialtyName && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {company.subspecialtyName}
                          </p>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Contacts Count */}
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200">
                      {company.contactCount}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 text-center">
                    {company.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                        <CheckCircle size={14} />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-full">
                        <Circle size={14} />
                        Off
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {/* Contacts & History (same as before) */}
                      <button
                        onClick={() => setContactsModalCompany(company)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        title="Manage contacts"
                      >
                        <Users size={14} />
                        Contacts
                      </button>
                      <button
                        onClick={() => setHistoryModalCompany(company)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                        title="View inquiry history"
                      >
                        <BarChart3 size={14} />
                        <span className="hidden sm:inline">History</span>
                        <span className="text-xs">({company.inquiryCount})</span>
                      </button>
                      {/* Burger menu: Edit / Delete (only when not editing this row) */}
                      {editingCompanyId !== company.id && (
                        <div className="relative" ref={menuOpenCompanyId === company.id ? menuRef : null}>
                          <button
                            onClick={() => setMenuOpenCompanyId((id) => (id === company.id ? null : company.id))}
                            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            title="More actions"
                          >
                            <MoreVertical size={18} />
                          </button>
                          {menuOpenCompanyId === company.id && (
                            <div className="absolute right-0 top-full mt-1 py-1 min-w-[120px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10">
                              <button
                                onClick={() => {
                                  handleStartEdit(company);
                                  setMenuOpenCompanyId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Pencil size={14} />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteClick(company);
                                  setMenuOpenCompanyId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {filteredCompanies.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'}
            {searchTerm && ` matching "${searchTerm}"`}
            {' '}&middot;{' '}
            {filteredCompanies.filter(c => c.isActive).length} active
          </p>
        </div>
      )}

      {/* Contacts Modal */}
      {contactsModalCompany && (
        <CompanyContactsModal
          company={contactsModalCompany}
          onClose={() => setContactsModalCompany(null)}
        />
      )}

      {/* History Modal */}
      {historyModalCompany && (
        <CompanyHistoryModal
          company={historyModalCompany}
          onClose={() => setHistoryModalCompany(null)}
        />
      )}

      {/* Delete confirmation modal */}
      {deletingCompanyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={handleCancelDelete}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete company?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will permanently delete the company and all its contacts. Resources that reference this company name will not be changed. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(CompaniesManagementPanel);
