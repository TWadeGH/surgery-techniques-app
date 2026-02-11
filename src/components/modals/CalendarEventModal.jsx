/**
 * CalendarEventModal Component
 *
 * Modal for scheduling a resource to Google Calendar.
 * Allows user to set date, time, and reminders for reviewing a surgical technique.
 */

import React, { useState, useEffect, memo } from 'react';
import { X, Calendar, Clock, Bell, StickyNote, Package, CheckCircle } from 'lucide-react';
import { useToast } from '../common';

// Reminder options (in minutes before event)
const REMINDER_OPTIONS = [
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
  { label: '1 day before', value: 1440 },
  { label: '2 days before', value: 2880 },
  { label: '1 week before', value: 10080 },
];

/**
 * CalendarEventModal Component
 *
 * @param {Object} props
 * @param {Object} props.resource - Resource object to schedule
 * @param {string} props.userNote - User's personal note for this resource
 * @param {Function} props.onClose - Callback when modal closes
 * @param {Function} props.onSuccess - Callback on successful event creation
 * @param {Function} props.onCreateEvent - Callback to create calendar event
 */
function CalendarEventModal({
  resource,
  userNote,
  onClose,
  onSuccess,
  onCreateEvent,
  connections = []
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  // Determine which providers are connected
  const googleConnected = connections.some(c => c.provider === 'google');
  const microsoftConnected = connections.some(c => c.provider === 'microsoft');
  const bothConnected = googleConnected && microsoftConnected;

  // Default to whichever single provider is connected, or google if both/neither
  const defaultProvider = microsoftConnected && !googleConnected ? 'microsoft' : 'google';
  const [selectedProvider, setSelectedProvider] = useState(defaultProvider);

  // Get tomorrow's date as default (formatted as YYYY-MM-DD)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    date: defaultDate,
    time: '07:30', // Default 7:30 AM
    reminder: 1440, // Default 1 day before (24 * 60 minutes)
    duration: 30 // 30 minutes
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate date is in the future
    const selectedDateTime = new Date(`${formData.date}T${formData.time}`);
    const now = new Date();
    if (selectedDateTime <= now) {
      toast.error('Please select a future date and time');
      return;
    }

    setLoading(true);

    try {
      await onCreateEvent({
        resourceId: resource.id,
        resourceTitle: resource.title,
        resourceUrl: resource.url,
        resourceDescription: resource.description,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        notes: userNote || '',
        reminder: formData.reminder,
        provider: selectedProvider
      });

      toast.success('Calendar event created successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating calendar event:', error);

      // Check for specific error codes
      if (error.message?.includes('NOT_CONNECTED')) {
        const providerName = selectedProvider === 'microsoft' ? 'Microsoft Outlook' : 'Google Calendar';
        toast.error(`Please connect your ${providerName} in Settings first`);
      } else if (error.message?.includes('TOKEN_EXPIRED')) {
        toast.error('Calendar connection expired. Please reconnect in Settings');
      } else {
        toast.error('Failed to create calendar event. Please try again.');
      }
    } finally {
      setLoading(false);
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

  // Format date/time for preview
  const formatEventPreview = () => {
    try {
      const eventDate = new Date(`${formData.date}T${formData.time}`);
      const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      return eventDate.toLocaleString('en-US', options);
    } catch {
      return 'Invalid date';
    }
  };

  const reminderLabel = REMINDER_OPTIONS.find(opt => opt.value === formData.reminder)?.label || '1 day before';

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
          aria-labelledby="calendar-event-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Calendar size={20} className="text-white" />
              </div>
              <div>
                <h2 id="calendar-event-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                  Add to Calendar
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Schedule surgical technique review
                </p>
              </div>
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
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Resource Info */}
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <div className="flex items-start gap-3">
                <Package size={20} className="text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {resource?.title}
                  </p>
                  {resource?.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                      {resource.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* User's Note (if exists) */}
            {userNote && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <StickyNote size={18} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Your Note:
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                      {userNote}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Provider Selector — only shown when both are connected */}
            {bothConnected && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Which calendar?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="calendar-provider"
                      value="google"
                      checked={selectedProvider === 'google'}
                      onChange={() => setSelectedProvider('google')}
                      className="accent-blue-600"
                    />
                    <span className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google Calendar
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="calendar-provider"
                      value="microsoft"
                      checked={selectedProvider === 'microsoft'}
                      onChange={() => setSelectedProvider('microsoft')}
                      className="accent-blue-600"
                    />
                    <span className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <rect width="11" height="11" x="1" y="1" fill="#F25022"/>
                        <rect width="11" height="11" x="13" y="1" fill="#7FBA00"/>
                        <rect width="11" height="11" x="1" y="13" fill="#00A4EF"/>
                        <rect width="11" height="11" x="13" y="13" fill="#FFB900"/>
                      </svg>
                      Microsoft Outlook
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Date Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Time Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Reminder Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reminder <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Bell size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={formData.reminder}
                  onChange={(e) => setFormData(prev => ({ ...prev, reminder: parseInt(e.target.value) }))}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none appearance-none"
                  required
                >
                  {REMINDER_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Event Preview */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Preview:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>{formatEventPreview()}</strong>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Reminder: {reminderLabel}
                  </p>
                </div>
              </div>
            </div>

            {/* Info note */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This event will be added to your {selectedProvider === 'microsoft' ? 'Microsoft Outlook' : 'Google'} Calendar with your personal notes included in the description.
            </p>
          </form>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Calendar size={16} />
                  Add to Calendar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(CalendarEventModal);
