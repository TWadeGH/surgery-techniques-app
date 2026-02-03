/**
 * MessagingPanel Component
 * Two-column layout: contact list on left, conversation on right. Stacked on mobile.
 * Supports single conversations and broadcast messaging to multiple recipients.
 */

import React, { useState, memo, useCallback } from 'react';
import { ArrowLeft, Users, Send, X } from 'lucide-react';
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

  // Multi-recipient compose state
  const [composeMode, setComposeMode] = useState(false);
  const [composeRecipients, setComposeRecipients] = useState([]);
  const [composeText, setComposeText] = useState('');
  const [sending, setSending] = useState(false);

  const activeContact = contacts.find(c => c.id === activeContactId);
  const contactName = activeContact?.email || '';

  const handleSelectContact = useCallback((contactId) => {
    setComposeMode(false);
    setComposeRecipients([]);
    loadConversation(contactId);
  }, [loadConversation]);

  const handleSendMessage = useCallback(async (body) => {
    if (!activeContactId) return;
    await sendMessage(activeContactId, body);
  }, [activeContactId, sendMessage]);

  const handleBack = useCallback(() => {
    setComposeMode(false);
    setComposeRecipients([]);
    loadConversation(null);
  }, [loadConversation]);

  // Handle multi-recipient compose
  const handleSendToMultiple = useCallback((recipientIds) => {
    const recipients = contacts.filter(c => recipientIds.includes(c.id));
    setComposeRecipients(recipients);
    setComposeMode(true);
    setComposeText('');
  }, [contacts]);

  const handleSendBroadcast = async () => {
    if (!composeText.trim() || composeRecipients.length === 0 || sending) return;

    setSending(true);
    try {
      // Send to each recipient
      await Promise.all(
        composeRecipients.map(recipient => sendMessage(recipient.id, composeText.trim()))
      );
      // Reset compose mode
      setComposeMode(false);
      setComposeRecipients([]);
      setComposeText('');
    } catch (err) {
      console.error('Error sending broadcast:', err);
    } finally {
      setSending(false);
    }
  };

  const handleCancelCompose = () => {
    setComposeMode(false);
    setComposeRecipients([]);
    setComposeText('');
  };

  return (
    <div className="glass rounded-2xl shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 320px)', minHeight: '500px' }}>
      <div className="flex h-full">
        {/* Contact List - hidden on mobile when conversation/compose is active */}
        <div className={`w-full md:w-80 md:flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col ${
          activeContactId || composeMode ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h3 className="font-semibold text-gray-900 dark:text-white">Messages</h3>
          </div>
          <ContactList
            contacts={contacts}
            activeContactId={activeContactId}
            onSelectContact={handleSelectContact}
            onSendToMultiple={handleSendToMultiple}
            loading={loadingContacts}
            currentUserRole={currentUser?.role}
          />
        </div>

        {/* Right panel: Conversation or Compose */}
        <div className={`flex-1 flex flex-col ${
          activeContactId || composeMode ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Mobile back button */}
          {(activeContactId || composeMode) && (
            <button
              onClick={handleBack}
              className="md:hidden flex items-center gap-2 px-4 py-2 text-sm text-purple-600 dark:text-purple-400 border-b border-gray-200 dark:border-gray-700"
            >
              <ArrowLeft size={16} />
              Back to contacts
            </button>
          )}

          {composeMode ? (
            // Compose view for multiple recipients
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-purple-600 dark:text-purple-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      Message to {composeRecipients.length} recipient{composeRecipients.length !== 1 ? 's' : ''}
                    </h3>
                  </div>
                  <button
                    onClick={handleCancelCompose}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded transition-colors"
                    aria-label="Cancel"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Recipients list */}
              <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex flex-wrap gap-1">
                  {composeRecipients.map(r => (
                    <span
                      key={r.id}
                      className="inline-flex items-center px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs"
                    >
                      {r.email}
                    </span>
                  ))}
                </div>
              </div>

              {/* Message compose area */}
              <div className="flex-1 flex flex-col justify-center items-center px-4 py-8">
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-4">
                  This message will be sent individually to each recipient.
                </p>
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="mb-3">
                  <textarea
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                    placeholder="Type your message..."
                    rows={4}
                    maxLength={5000}
                    className="w-full resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCancelCompose}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendBroadcast}
                    disabled={!composeText.trim() || sending}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                  >
                    <Send size={16} />
                    {sending ? 'Sending...' : `Send to ${composeRecipients.length}`}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Regular conversation view
            <ConversationView
              messages={messages}
              currentUserId={currentUser?.id}
              contactName={contactName}
              onSendMessage={handleSendMessage}
              loading={loadingMessages}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(MessagingPanel);
