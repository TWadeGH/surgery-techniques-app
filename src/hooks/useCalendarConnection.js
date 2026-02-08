/**
 * useCalendarConnection Hook
 *
 * Manages calendar connections for Google Calendar and Microsoft Outlook.
 * Handles OAuth flow, connection status, and disconnection.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useCalendarConnection(userId) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user's calendar connections
  const loadConnections = useCallback(async () => {
    if (!userId) {
      setConnections([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_calendar_connections')
        .select('*')
        .eq('user_id', userId)
        .order('connected_at', { ascending: false });

      if (fetchError) throw fetchError;

      setConnections(data || []);
    } catch (err) {
      console.error('Error loading calendar connections:', err);
      setError(err.message);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load connections on mount and when userId changes
  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Check if a specific provider is connected
  const isConnected = useCallback((provider) => {
    return connections.some(conn => conn.provider === provider);
  }, [connections]);

  // Get connection details for a provider
  const getConnection = useCallback((provider) => {
    return connections.find(conn => conn.provider === provider);
  }, [connections]);

  // Initiate OAuth flow for Google Calendar
  const connectGoogle = useCallback(async () => {
    try {
      // Generate state parameter for CSRF protection
      const state = crypto.randomUUID();
      sessionStorage.setItem('oauth_state', state);

      // Get current user session to pass to callback
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Build Google OAuth URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || window.location.origin;
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '663379322167-gkbauqrtkf5ecnib4hpdoelbbncsc38q.apps.googleusercontent.com';

      const redirectUri = `${supabaseUrl}/functions/v1/google-oauth-callback`;

      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthUrl.searchParams.set('client_id', googleClientId);
      googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
      googleAuthUrl.searchParams.set('response_type', 'code');
      googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events');
      googleAuthUrl.searchParams.set('state', state);
      googleAuthUrl.searchParams.set('access_type', 'offline'); // Get refresh token
      googleAuthUrl.searchParams.set('prompt', 'consent'); // Force consent to ensure refresh token

      console.log('Initiating Google OAuth flow...');
      console.log('Redirect URI:', redirectUri);

      // Redirect to Google OAuth
      window.location.href = googleAuthUrl.toString();
    } catch (err) {
      console.error('Error initiating Google OAuth:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Disconnect a calendar
  const disconnect = useCallback(async (provider) => {
    try {
      setError(null);

      // Get session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call disconnect Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || window.location.origin;
      const response = await fetch(`${supabaseUrl}/functions/v1/disconnect-calendar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect calendar');
      }

      console.log(`${provider} calendar disconnected successfully`);

      // Reload connections
      await loadConnections();

      return { success: true };
    } catch (err) {
      console.error('Error disconnecting calendar:', err);
      setError(err.message);
      throw err;
    }
  }, [loadConnections]);

  return {
    connections,
    loading,
    error,
    isConnected,
    getConnection,
    connectGoogle,
    disconnect,
    reload: loadConnections
  };
}
