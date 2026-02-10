// Delete Calendar Event - Edge Function
// Deletes a calendar event from user's Google Calendar and database

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// AES-256-GCM encrypt
async function encryptToken(plaintext: string, base64Key: string): Promise<{ ciphertext: string; iv: string }> {
  const rawKey = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv))
  }
}

// AES-256-GCM decrypt
async function decryptToken(ciphertext: string, ivBase64: string, base64Key: string): Promise<string> {
  const rawKey = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt'])
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0))
  const encrypted = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
  return new TextDecoder().decode(decrypted)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const TOKEN_ENCRYPTION_KEY = Deno.env.get('TOKEN_ENCRYPTION_KEY') || ''
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || ''
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || ''

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { eventId } = await req.json()

    if (!eventId) {
      return new Response(JSON.stringify({ error: 'Missing eventId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Deleting calendar event:', eventId, 'for user:', user.id)

    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', eventId)
      .eq('user_id', user.id)
      .single()

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: 'Event not found or unauthorized', code: 'NOT_FOUND' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: connection, error: connectionError } = await supabase
      .from('user_calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', event.provider)
      .single()

    if (connectionError || !connection) {
      console.warn('Calendar connection not found, deleting from database only')
    } else if (connection.access_token_encrypted) {
      // Decrypt access token
      let accessToken: string | null = null
      try {
        if (!connection.access_token_iv) {
          accessToken = connection.access_token_encrypted
          console.log('Using legacy plaintext token')
        } else if (TOKEN_ENCRYPTION_KEY) {
          accessToken = await decryptToken(
            connection.access_token_encrypted,
            connection.access_token_iv,
            TOKEN_ENCRYPTION_KEY
          )
          console.log('Token decrypted successfully')
        }
      } catch (decryptErr) {
        console.error('Failed to decrypt token, skipping Google API deletion:', decryptErr)
      }

      // Refresh token if expiring within 5 minutes
      const tokenExpiry = new Date(connection.token_expires_at)
      const now = new Date()
      if (accessToken && tokenExpiry.getTime() - now.getTime() < 5 * 60 * 1000) {
        console.log('Token expiring soon, refreshing...')
        try {
          let refreshToken: string
          if (!connection.refresh_token_iv) {
            refreshToken = connection.refresh_token_encrypted
          } else {
            refreshToken = await decryptToken(
              connection.refresh_token_encrypted,
              connection.refresh_token_iv,
              TOKEN_ENCRYPTION_KEY
            )
          }

          const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: GOOGLE_CLIENT_ID,
              client_secret: GOOGLE_CLIENT_SECRET,
              refresh_token: refreshToken,
              grant_type: 'refresh_token'
            })
          })

          const refreshData = await refreshResponse.json()

          if (refreshResponse.ok && !refreshData.error) {
            const encryptedNew = await encryptToken(refreshData.access_token, TOKEN_ENCRYPTION_KEY)
            await supabase
              .from('user_calendar_connections')
              .update({
                access_token_encrypted: encryptedNew.ciphertext,
                access_token_iv: encryptedNew.iv,
                token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
              })
              .eq('user_id', user.id)
              .eq('provider', event.provider)

            accessToken = refreshData.access_token
            console.log('Token refreshed successfully')
          } else {
            console.warn('Token refresh failed, skipping Google API deletion:', refreshData)
            accessToken = null
          }
        } catch (refreshErr) {
          console.error('Token refresh error, skipping Google API deletion:', refreshErr)
          accessToken = null
        }
      }

      if (accessToken) {
        try {
          const calendarResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${connection.calendar_id}/events/${event.external_event_id}`,
            {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${accessToken}` }
            }
          )

          if (!calendarResponse.ok && calendarResponse.status !== 404) {
            const errorData = await calendarResponse.json().catch(() => ({}))
            console.error('Google Calendar API error:', errorData)
          } else {
            console.log('Event deleted from Google Calendar successfully')
          }
        } catch (apiError) {
          console.error('Failed to delete from Google Calendar (non-blocking):', apiError)
        }
      }
    }

    // Always delete from our database
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Database error:', deleteError)
      return new Response(JSON.stringify({
        error: 'Failed to delete event from database',
        details: deleteError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Event deleted successfully')

    return new Response(JSON.stringify({ success: true, message: 'Calendar event deleted successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
