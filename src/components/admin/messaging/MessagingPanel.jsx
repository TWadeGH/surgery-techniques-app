/**
 * MessagingPanel Component
 * Two-column layout: contact list on left, conversation on right. Stacked on mobile.
 */

import React, { memo, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import ContactList from './ContactList';
import ConversationView from './ConversationView';
import { useAdminMessaging } from '../../../hooks/useAdminMessaging';

function MessagingPanel({ currentUser }) {
  const {
    contacts,
    activeContactId,
    messages,
    loadingContacts,
    loadingMessages,
    loadConversation,
    sendMessage,
  } = useAdminMessaging(currentUser);

  const activeContact = contacts.find(c => c.id === activeContactId);
  const contactName = activeContact?.email || '';

  const handleSelectContact = useCallback((contactId) => {
    loadConversation(contactId);
  }, [loadConversation]);

  const handleSendMessage = useCallback(async (body) => {
    if (!activeContactId) return;
    await sendMessage(activeContactId, body);
  }, [activeContactId, sendMessage]);

  const handleBack = useCallback(() => {
    loadConversation(null);
  }, [loadConversation]);

  return (
    <div className="glass rounded-2xl shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 320px)', minHeight: '500px' }}>
      <div className="flex h-full">
        {/* Contact List - hidden on mobile when conversation is active */}
        <div className={`w-full md:w-80 md:flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto ${
          activeContactId ? 'hidden md:block' : 'block'
        }`}>
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Messages</h3>
          </div>
          <ContactList
            contacts={contacts}
            activeContactId={activeContactId}
            onSelectContact={handleSelectContact}
            loading={loadingContacts}
            currentUserRole={currentUser?.role}
          />
        </div>

        {/* Conversation - full width on mobile when active */}
        <div className={`flex-1 flex flex-col ${
          activeContactId ? 'block' : 'hidden md:flex'
        }`}>
          {/* Mobile back button */}
          {activeContactId && (
            <button
              onClick={handleBack}
              className="md:hidden flex items-center gap-2 px-4 py-2 text-sm text-purple-600 dark:text-purple-400 border-b border-gray-200 dark:border-gray-700"
            >
              <ArrowLeft size={16} />
              Back to contacts
            </button>
          )}
          <ConversationView
            messages={messages}
            currentUserId={currentUser?.id}
            contactName={contactName}
            onSendMessage={handleSendMessage}
            loading={loadingMessages}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(MessagingPanel);
