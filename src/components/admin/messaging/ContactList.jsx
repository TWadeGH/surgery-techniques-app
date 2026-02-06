/**
 * ContactList Component
 * Displays reachable admin contacts grouped by role hierarchy.
 *
 * Super admin sees: admins and subadmins grouped by specialty/subspecialty
 * Specialty admin sees: super admins, then subspecialty admins under them
 * Subspecialty admin sees: super admins, then specialty admin for their specialty
 */

import React, { useMemo, memo } from 'react';
import { MessageSquare } from 'lucide-react';
import { USER_ROLES } from '../../../utils/constants';

const ROLE_BADGES = {
  [USER_ROLES.SUPER_ADMIN]: { label: 'Super Admin', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  [USER_ROLES.SPECIALTY_ADMIN]: { label: 'Specialty Admin', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  [USER_ROLES.SUBSPECIALTY_ADMIN]: { label: 'Subspecialty Admin', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

function ContactList({ contacts, activeContactId, onSelectContact, loading, currentUserRole }) {
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
    <div>
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
                onSelect={onSelectContact}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactRow({ contact, isActive, onSelect }) {
  const badge = ROLE_BADGES[contact.role] || { label: contact.role, color: 'bg-gray-100 text-gray-700' };
  const displayName = contact.email || 'Unknown';
  const preview = contact.lastMessage?.body
    ? (contact.lastMessage.body.length > 35
        ? contact.lastMessage.body.substring(0, 35) + '...'
        : contact.lastMessage.body)
    : null;

  return (
    <button
      onClick={() => onSelect(contact.id)}
      className={`w-full text-left px-4 py-3 transition-colors ${
        isActive
          ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-600'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-transparent'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {displayName}
            </span>
            {contact.unreadCount > 0 && (
              <span className="flex-shrink-0 bg-purple-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {contact.unreadCount > 9 ? '9+' : contact.unreadCount}
              </span>
            )}
          </div>
          <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full ${badge.color} mb-1`}>
            {badge.label}
          </span>
          {preview && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{preview}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {contact.lastMessage?.created_at && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatTime(contact.lastMessage.created_at)}
            </span>
          )}
          <MessageSquare size={14} className="text-purple-500 dark:text-purple-400" />
        </div>
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
      const aName = (a.full_name || a.email || '').toLowerCase();
      const bName = (b.full_name || b.email || '').toLowerCase();
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
 * Subspecialty admin: super admins first, then the specialty admin for their specialty.
 */
function buildSubspecialtyAdminSections(contacts) {
  const sections = [];
  const superAdmins = contacts.filter(c => c.role === USER_ROLES.SUPER_ADMIN);
  const specAdmins = contacts.filter(c => c.role === USER_ROLES.SPECIALTY_ADMIN);

  if (superAdmins.length > 0) {
    sections.push({ title: 'Super Admins', contacts: superAdmins });
  }

  if (specAdmins.length > 0) {
    const specName = specAdmins[0]?.specialtyName || 'Specialty Admin';
    sections.push({ title: specName, contacts: specAdmins });
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
