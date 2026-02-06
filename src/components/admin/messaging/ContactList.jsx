/**
 * ContactList Component
 * Displays reachable admin contacts grouped by role hierarchy.
 * Supports multi-select for broadcast messaging.
 *
 * Super admin sees: "Message All" + admins and subadmins grouped by specialty
 * Specialty admin sees: "Message All Subadmins" + super admins + subspecialty admins
 * Subspecialty admin sees: super admins + specialty admin + peer subspecialty admins in same specialty
 */

import React, { useState, useMemo, memo } from 'react';
import { MessageSquare, Send, Users, X } from 'lucide-react';
import { USER_ROLES } from '../../../utils/constants';

const ROLE_BADGES = {
  [USER_ROLES.SUPER_ADMIN]: { label: 'Super Admin', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  [USER_ROLES.SPECIALTY_ADMIN]: { label: 'Specialty Admin', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  [USER_ROLES.SUBSPECIALTY_ADMIN]: { label: 'Subspecialty Admin', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

function ContactList({
  contacts,
  activeContactId,
  onSelectContact,
  onSendToMultiple,
  loading,
  currentUserRole,
}) {
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Build grouped sections based on current user's role
  const sections = useMemo(() => {
    if (!contacts || contacts.length === 0) return [];

    if (currentUserRole === USER_ROLES.SUPER_ADMIN) {
      return buildSuperAdminSections(contacts);
    } else if (currentUserRole === USER_ROLES.SPECIALTY_ADMIN) {
      return buildSpecialtyAdminSections(contacts);
    } else if (currentUserRole === USER_ROLES.SUBSPECIALTY_ADMIN) {
      return buildSubspecialtyAdminSections(contacts);
    }
    return [{ title: 'Contacts', contacts }];
  }, [contacts, currentUserRole]);

  // Get subspecialty admins for "Message All Subadmins" (specialty admin only)
  const subspecialtyAdmins = useMemo(() => {
    if (currentUserRole !== USER_ROLES.SPECIALTY_ADMIN) return [];
    return contacts.filter(c => c.role === USER_ROLES.SUBSPECIALTY_ADMIN);
  }, [contacts, currentUserRole]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(contacts.map(c => c.id)));
  };

  const selectAllSubadmins = () => {
    setSelectedIds(new Set(subspecialtyAdmins.map(c => c.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setMultiSelectMode(false);
  };

  const handleSendToSelected = () => {
    if (selectedIds.size > 0 && onSendToMultiple) {
      onSendToMultiple(Array.from(selectedIds));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!contacts || contacts.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-gray-500 dark:text-gray-400 text-sm">No contacts available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Broadcast buttons */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 space-y-2">
        {currentUserRole === USER_ROLES.SUPER_ADMIN && (
          <button
            onClick={() => {
              setMultiSelectMode(true);
              selectAll();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
          >
            <Users size={16} />
            Message All Admins
          </button>
        )}
        {currentUserRole === USER_ROLES.SPECIALTY_ADMIN && subspecialtyAdmins.length > 0 && (
          <button
            onClick={() => {
              setMultiSelectMode(true);
              selectAllSubadmins();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
          >
            <Users size={16} />
            Message All Subadmins
          </button>
        )}
        {!multiSelectMode && (currentUserRole === USER_ROLES.SUPER_ADMIN || currentUserRole === USER_ROLES.SPECIALTY_ADMIN) && (
          <button
            onClick={() => setMultiSelectMode(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Select Multiple
          </button>
        )}
      </div>

      {/* Multi-select action bar */}
      {multiSelectMode && (
        <div className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800 flex items-center justify-between gap-2">
          <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendToSelected}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
            >
              <Send size={12} />
              Compose
            </button>
            <button
              onClick={clearSelection}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded transition-colors"
              aria-label="Cancel"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Contact sections */}
      <div className="flex-1 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title}>
            {/* Section header */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {section.title}
              </h4>
            </div>
            {/* Contact rows */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {section.contacts.map(contact => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  isActive={contact.id === activeContactId}
                  isSelected={selectedIds.has(contact.id)}
                  multiSelectMode={multiSelectMode}
                  onSelect={onSelectContact}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactRow({ contact, isActive, isSelected, multiSelectMode, onSelect, onToggleSelect }) {
  const badge = ROLE_BADGES[contact.role] || { label: contact.role, color: 'bg-gray-100 text-gray-700' };
  const displayName = contact.email || 'Unknown';
  const preview = contact.lastMessage?.body
    ? (contact.lastMessage.body.length > 35
        ? contact.lastMessage.body.substring(0, 35) + '...'
        : contact.lastMessage.body)
    : null;

  const handleClick = () => {
    if (multiSelectMode) {
      onToggleSelect(contact.id);
    } else {
      onSelect(contact.id);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-4 py-3 transition-colors ${
        isActive && !multiSelectMode
          ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-600'
          : isSelected
          ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox in multi-select mode */}
        {multiSelectMode && (
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isSelected
              ? 'bg-purple-600 border-purple-600'
              : 'border-gray-300 dark:border-gray-600'
          }`}>
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {displayName}
            </span>
            {contact.unreadCount > 0 && !multiSelectMode && (
              <span className="flex-shrink-0 bg-purple-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {contact.unreadCount > 9 ? '9+' : contact.unreadCount}
              </span>
            )}
          </div>
          <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full ${badge.color} mb-1`}>
            {badge.label}
          </span>
          {preview && !multiSelectMode && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{preview}</p>
          )}
        </div>

        {!multiSelectMode && (
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {contact.lastMessage?.created_at && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatTime(contact.lastMessage.created_at)}
              </span>
            )}
            <MessageSquare size={14} className="text-purple-500 dark:text-purple-400" />
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * Super admin: group by specialty, with specialty admins and subspecialty admins listed under each.
 */
function buildSuperAdminSections(contacts) {
  const sections = [];

  // Group by specialty
  const bySpecialty = {};
  const noSpecialty = [];

  contacts.forEach(c => {
    const key = c.specialtyName || null;
    if (key) {
      if (!bySpecialty[key]) bySpecialty[key] = [];
      bySpecialty[key].push(c);
    } else {
      noSpecialty.push(c);
    }
  });

  // Sort specialty groups alphabetically
  const sortedKeys = Object.keys(bySpecialty).sort();

  for (const specName of sortedKeys) {
    const group = bySpecialty[specName];
    // Sort: specialty admins first, then subspecialty admins alphabetically
    group.sort((a, b) => {
      if (a.role === USER_ROLES.SPECIALTY_ADMIN && b.role !== USER_ROLES.SPECIALTY_ADMIN) return -1;
      if (a.role !== USER_ROLES.SPECIALTY_ADMIN && b.role === USER_ROLES.SPECIALTY_ADMIN) return 1;
      const aName = (a.email || '').toLowerCase();
      const bName = (b.email || '').toLowerCase();
      return aName.localeCompare(bName);
    });
    sections.push({ title: specName, contacts: group });
  }

  if (noSpecialty.length > 0) {
    sections.push({ title: 'Other', contacts: noSpecialty });
  }

  return sections;
}

/**
 * Specialty admin: super admins first, then subspecialty admins grouped by subspecialty.
 */
function buildSpecialtyAdminSections(contacts) {
  const sections = [];
  const superAdmins = contacts.filter(c => c.role === USER_ROLES.SUPER_ADMIN);
  const subAdmins = contacts.filter(c => c.role === USER_ROLES.SUBSPECIALTY_ADMIN);

  if (superAdmins.length > 0) {
    sections.push({ title: 'Super Admins', contacts: superAdmins });
  }

  if (subAdmins.length > 0) {
    // Group subspecialty admins by subspecialty name
    const bySubspec = {};
    subAdmins.forEach(c => {
      const key = c.subspecialtyName || 'Other';
      if (!bySubspec[key]) bySubspec[key] = [];
      bySubspec[key].push(c);
    });

    const sortedKeys = Object.keys(bySubspec).sort();
    for (const subName of sortedKeys) {
      sections.push({ title: subName, contacts: bySubspec[subName] });
    }
  }

  return sections;
}

/**
 * Subspecialty admin: super admins first, then the specialty admin, then peer subspecialty admins.
 */
function buildSubspecialtyAdminSections(contacts) {
  const sections = [];
  const superAdmins = contacts.filter(c => c.role === USER_ROLES.SUPER_ADMIN);
  const specAdmins = contacts.filter(c => c.role === USER_ROLES.SPECIALTY_ADMIN);
  const subAdmins = contacts.filter(c => c.role === USER_ROLES.SUBSPECIALTY_ADMIN);

  if (superAdmins.length > 0) {
    sections.push({ title: 'Super Admins', contacts: superAdmins });
  }

  if (specAdmins.length > 0) {
    const specName = specAdmins[0]?.specialtyName || 'Specialty Admin';
    sections.push({ title: specName, contacts: specAdmins });
  }

  if (subAdmins.length > 0) {
    // Group peer subspecialty admins by their subspecialty name
    const bySubspec = {};
    subAdmins.forEach(c => {
      const key = c.subspecialtyName || 'Other';
      if (!bySubspec[key]) bySubspec[key] = [];
      bySubspec[key].push(c);
    });

    const sortedKeys = Object.keys(bySubspec).sort();
    for (const subName of sortedKeys) {
      sections.push({ title: subName, contacts: bySubspec[subName] });
    }
  }

  return sections;
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default memo(ContactList);
