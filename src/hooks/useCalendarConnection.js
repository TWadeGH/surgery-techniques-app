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
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Generate state parameter with user ID for callback identification
      // Format: "userId:randomUUID" - userId lets callback know who to save for
      const randomPart = crypto.randomUUID();
      const state = `${session.user.id}:${randomPart}`;
      sessionStorage.setItem('oauth_state', randomPart);

      // Build Google OAuth URL
      const supabaseUrl = 'https://bufnygjdkdemacqbxcrh.supabase.co';
      const googleClientId = '663379322167-gkbauqrtkf5ecnib4hpdoelbbncsc38q.apps.googleusercontent.com';

      const redirectUri = `${supabaseUrl}/functions/v1/google-oauth-callback`;

      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthUrl.searchParams.set('client_id', googleClientId);
      googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
      googleAuthUrl.searchParams.set('response_type', 'code');
      googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly');
      googleAuthUrl.searchParams.set('state', state);
      googleAuthUrl.searchParams.set('access_type', 'offline');
      googleAuthUrl.searchParams.set('prompt', 'consent');

      console.log('=== GOOGLE OAUTH DEBUG ===');
      console.log('User ID:', session.user.id);
      console.log('Redirect URI:', redirectUri);
      console.log('State:', state);
      console.log('========================');

      // Redirect to Google OAuth
      window.location.href = googleAuthUrl.toString();
    } catch (err) {
      console.error('Error initiating Google OAuth:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Initiate OAuth flow for Microsoft Outlook Calendar
  const connectMicrosoft = useCallback(async () => {
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Generate state parameter with user ID for callback identification
      // Format: "userId:randomUUID" - userId lets callback know who to save for
      const randomPart = crypto.randomUUID();
      const state = `${session.user.id}:${randomPart}`;
      sessionStorage.setItem('oauth_state', randomPart);

      // Build Microsoft OAuth URL
      const supabaseUrl = 'https://bufnygjdkdemacqbxcrh.supabase.co';
      const MICROSOFT_CLIENT_ID = 'b80af4dd-7465-4163-bb5b-66818102969c';

      const redirectUri = `${supabaseUrl}/functions/v1/outlook-oauth-callback`;

      const msAuthUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      msAuthUrl.searchParams.set('client_id', MICROSOFT_CLIENT_ID);
      msAuthUrl.searchParams.set('redirect_uri', redirectUri);
      msAuthUrl.searchParams.set('response_type', 'code');
      msAuthUrl.searchParams.set('scope', 'Calendars.ReadWrite offline_access User.Read');
      msAuthUrl.searchParams.set('state', state);
      msAuthUrl.searchParams.set('response_mode', 'query');

      console.log('=== MICROSOFT OAUTH DEBUG ===');
      console.log('User ID:', session.user.id);
      console.log('Redirect URI:', redirectUri);
      console.log('State:', state);
      console.log('=============================');

      // Redirect to Microsoft OAuth
      window.location.href = msAuthUrl.toString();
    } catch (err) {
      console.error('Error initiating Microsoft OAuth:', err);
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
      const supabaseUrl = 'https://bufnygjdkdemacqbxcrh.supabase.co';
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
    connectMicrosoft,
    disconnect,
    reload: loadConnections
  };
}
