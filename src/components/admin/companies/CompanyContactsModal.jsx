/**
 * CompanyContactsModal Component
 *
 * Modal for managing company contacts (reps).
 * Allows adding, editing, and removing contact emails.
 */

import React, { useState, useEffect, memo } from 'react';
import { X, Plus, Trash2, Mail, User, Phone, CheckCircle } from 'lucide-react';
import { useSubspecialtyCompanies } from '../../../hooks/useSubspecialtyCompanies';
import { useToast } from '../../common';

/**
 * CompanyContactsModal Component
 *
 * @param {Object} props
 * @param {Object} props.company - Company object
 * @param {Function} props.onClose - Callback when modal closes
 */
function CompanyContactsModal({ company, onClose }) {
  const toast = useToast();
  const {
    addContact,
    updateContact,
    removeContact,
    getCompanyContacts
  } = useSubspecialtyCompanies();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState({ email: '', name: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, [company.id]);

  const loadContacts = async () => {
    setLoading(true);
    const result = await getCompanyContacts(company.id);
    if (result.success) {
      setContacts(result.data);
    } else {
      toast.error(result.error || 'Failed to load contacts');
    }
    setLoading(false);
  };

  const handleAddContact = async () => {
    if (!newContact.email.trim()) {
      toast.error('Email is required');
      return;
    }

    setSubmitting(true);
    const result = await addContact(company.id, {
      email: newContact.email.trim(),
      name: newContact.name.trim() || null,
      phone: newContact.phone.trim() || null
    });

    if (result.success) {
      toast.success('Contact added successfully');
      setNewContact({ email: '', name: '', phone: '' });
      setShowAddForm(false);
      await loadContacts();
    } else {
      toast.error(result.error || 'Failed to add contact');
    }
    setSubmitting(false);
  };

  const handleRemoveContact = async (contactId) => {
    if (!confirm('Are you sure you want to remove this contact?')) return;

    const result = await removeContact(contactId);
    if (result.success) {
      toast.success('Contact removed successfully');
      await loadContacts();
    } else {
      toast.error(result.error || 'Failed to remove contact');
    }
  };

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
          className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contacts-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 id="contacts-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                {company.company_name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage contacts
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
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-300">Loading...</span>
              </div>
            ) : (
              <>
                {/* Contacts List */}
                <div className="space-y-3 mb-4">
                  {contacts.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                      <Mail size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No contacts yet</p>
                      <p className="text-sm">Add a contact to activate this company</p>
                    </div>
                  ) : (
                    contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Mail size={14} className="text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {contact.email}
                            </span>
                          </div>
                          {(contact.name || contact.phone) && (
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {contact.name && (
                                <span className="flex items-center gap-1">
                                  <User size={12} />
                                  {contact.name}
                                </span>
                              )}
                              {contact.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={12} />
                                  {contact.phone}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveContact(contact.id)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Remove contact"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Contact Form */}
                {showAddForm ? (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-2 border-dashed border-purple-200 dark:border-purple-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Plus size={16} className="text-purple-600" />
                      Add Contact
                    </h3>
                    <div className="space-y-3">
                      {/* Email (required) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={newContact.email}
                          onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="rep@company.com"
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                          autoFocus
                        />
                      </div>

                      {/* Name (optional) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Name <span className="text-gray-400">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={newContact.name}
                          onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Jane Smith"
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                        />
                      </div>

                      {/* Phone (optional) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Phone <span className="text-gray-400">(optional)</span>
                        </label>
                        <input
                          type="tel"
                          value={newContact.phone}
                          onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+1 (555) 123-4567"
                          className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                        />
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleAddContact}
                          disabled={submitting}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Adding...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={16} />
                              Add Contact
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setShowAddForm(false);
                            setNewContact({ email: '', name: '', phone: '' });
                          }}
                          disabled={submitting}
                          className="px-4 py-2 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    <Plus size={18} />
                    Add Contact
                  </button>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-b-2xl">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
              {contacts.length > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle size={14} />
                  Active
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(CompanyContactsModal);
