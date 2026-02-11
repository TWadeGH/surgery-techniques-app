/**
 * useCalendarEvents Hook
 *
 * Manages calendar events for resources with create, read, and delete operations.
 *
 * @example
 * const { events, loading, createEvent, deleteEvent, getEventForResource } = useCalendarEvents(userId);
 *
 * Features:
 * - Load user's calendar events
 * - Create new calendar events
 * - Delete calendar events
 * - Auto-filter past events (only show upcoming)
 * - Optimistic UI updates
 * - Error handling with rollback
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export function useCalendarEvents(userId) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Load user's calendar events (only upcoming events)
   */
  const loadEvents = useCallback(async () => {
    if (!userId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('event_start', new Date().toISOString()) // Only upcoming events
        .order('event_start', { ascending: true });

      if (fetchError) throw fetchError;

      setEvents(data || []);
    } catch (err) {
      console.error('Error loading calendar events:', err);
      setError(err.message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load events on mount and when userId changes
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  /**
   * Create a new calendar event
   * @param {Object} eventData - Event data (resourceId, date, time, notes, etc.)
   * @returns {Promise<Object>} Created event data
   */
  const createEvent = useCallback(async (eventData) => {
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Get user's timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Call Edge Function to create event
      const supabaseUrl = 'https://bufnygjdkdemacqbxcrh.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/create-calendar-event`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: eventData.provider || 'google',
          resourceId: eventData.resourceId,
          resourceTitle: eventData.resourceTitle,
          resourceUrl: eventData.resourceUrl,
          resourceDescription: eventData.resourceDescription,
          eventDate: eventData.date,
          eventTime: eventData.time,
          duration: eventData.duration || 30,
          notes: eventData.notes,
          timezone
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create calendar event');
      }

      const result = await response.json();
      console.log('Calendar event created:', result);

      // Reload events to get the newly created one
      await loadEvents();

      return result;
    } catch (err) {
      console.error('Error creating calendar event:', err);
      throw err;
    }
  }, [userId, loadEvents]);

  /**
   * Delete a calendar event
   * @param {string} eventId - Event ID to delete
   */
  const deleteEvent = useCallback(async (eventId) => {
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Optimistic update - remove event from UI immediately
    const previousEvents = events;
    setEvents(prev => prev.filter(e => e.id !== eventId));

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call Edge Function to delete event
      const supabaseUrl = 'https://bufnygjdkdemacqbxcrh.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-calendar-event`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ eventId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete calendar event');
      }

      console.log('Calendar event deleted successfully');
    } catch (err) {
      console.error('Error deleting calendar event:', err);
      // Rollback optimistic update
      setEvents(previousEvents);
      throw err;
    }
  }, [userId, events]);

  /**
   * Get calendar event for a specific resource
   * @param {string} resourceId - Resource ID
   * @returns {Object|null} Event object or null
   */
  const getEventForResource = useCallback((resourceId) => {
    return events.find(event => event.resource_id === resourceId) || null;
  }, [events]);

  /**
   * Check if a resource has an upcoming calendar event
   * @param {string} resourceId - Resource ID
   * @returns {boolean}
   */
  const hasEvent = useCallback((resourceId) => {
    return events.some(event => event.resource_id === resourceId);
  }, [events]);

  /**
   * Get count of upcoming events
   */
  const count = useMemo(() => events.length, [events]);

  return {
    events,
    loading,
    error,
    count,
    createEvent,
    deleteEvent,
    getEventForResource,
    hasEvent,
    reload: loadEvents
  };
}

export default useCalendarEvents;
