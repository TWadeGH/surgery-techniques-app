/**
 * ConversationView Component
 * Chat bubble interface with sent/received messages, auto-scroll, date separators, and text input.
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { Send } from 'lucide-react';

function ConversationView({ messages, currentUserId, contactName, onSendMessage, loading }) {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when conversation loads
  useEffect(() => {
    inputRef.current?.focus();
  }, [contactName]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setInputText('');
    try {
      await onSendMessage(text);
    } catch {
      setInputText(text); // Restore on failure
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!contactName) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
        <p className="text-center">Select a conversation to start messaging</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group messages by date
  let lastDate = null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{contactName}</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
            No messages yet. Start the conversation!
          </p>
        )}

        {messages.map((msg) => {
          const isSent = msg.sender_id === currentUserId;
          const msgDate = new Date(msg.created_at).toLocaleDateString();
          let showDateSeparator = false;
          if (msgDate !== lastDate) {
            showDateSeparator = true;
            lastDate = msgDate;
          }

          return (
            <React.Fragment key={msg.id}>
              {showDateSeparator && (
                <div className="flex items-center justify-center py-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    {formatDateLabel(msg.created_at)}
                  </span>
                </div>
              )}
              <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                    isSent
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md'
                  }`}
                >
                  {msg.body}
                  <div className={`text-xs mt-1 ${isSent ? 'text-purple-200' : 'text-gray-400 dark:text-gray-500'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            maxLength={5000}
            className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export default memo(ConversationView);
