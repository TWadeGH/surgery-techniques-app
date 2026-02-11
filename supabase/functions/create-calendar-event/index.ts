// Create Calendar Event - Edge Function
// Creates a calendar event in user's Google Calendar

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
    const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID') || ''
    const MICROSOFT_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET') || ''

    if (!TOKEN_ENCRYPTION_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error', code: 'CONFIG_ERROR' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const {
      provider,
      resourceId,
      resourceTitle,
      resourceUrl,
      resourceDescription,
      eventDate,
      eventTime,
      duration,
      notes,
      timezone
    } = await req.json()

    if (!provider || !resourceId || !eventDate || !eventTime) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        required: ['provider', 'resourceId', 'eventDate', 'eventTime']
      }), {
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

    console.log('Creating calendar event for user:', user.id)

    const { data: connection, error: connectionError } = await supabase
      .from('user_calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single()

    if (connectionError || !connection) {
      return new Response(JSON.stringify({ error: 'Calendar not connected', code: 'NOT_CONNECTED' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Decrypt access token
    let accessToken: string
    try {
      if (!connection.access_token_iv) {
        accessToken = connection.access_token_encrypted
        console.log('Using legacy plaintext token')
      } else {
        accessToken = await decryptToken(
          connection.access_token_encrypted,
          connection.access_token_iv,
          TOKEN_ENCRYPTION_KEY
        )
        console.log('Token decrypted successfully')
      }
    } catch (decryptErr) {
      console.error('Failed to decrypt token:', decryptErr)
      return new Response(JSON.stringify({
        error: 'Failed to decrypt token, please reconnect your calendar',
        code: 'DECRYPT_ERROR'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Refresh token if expiring within 5 minutes
    const tokenExpiry = new Date(connection.token_expires_at)
    const now = new Date()
    if (tokenExpiry.getTime() - now.getTime() < 5 * 60 * 1000) {
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

        const refreshUrl = provider === 'microsoft'
          ? 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
          : 'https://oauth2.googleapis.com/token'
        const refreshClientId = provider === 'microsoft' ? MICROSOFT_CLIENT_ID : GOOGLE_CLIENT_ID
        const refreshClientSecret = provider === 'microsoft' ? MICROSOFT_CLIENT_SECRET : GOOGLE_CLIENT_SECRET

        const refreshResponse = await fetch(refreshUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: refreshClientId,
            client_secret: refreshClientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
          })
        })

        const refreshData = await refreshResponse.json()

        if (!refreshResponse.ok || refreshData.error) {
          console.error('Token refresh failed:', refreshData)
          return new Response(JSON.stringify({
            error: 'Session expired, please reconnect your calendar',
            code: 'TOKEN_EXPIRED'
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const encryptedNew = await encryptToken(refreshData.access_token, TOKEN_ENCRYPTION_KEY)
        await supabase
          .from('user_calendar_connections')
          .update({
            access_token_encrypted: encryptedNew.ciphertext,
            access_token_iv: encryptedNew.iv,
            token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
          })
          .eq('user_id', user.id)
          .eq('provider', provider)

        accessToken = refreshData.access_token
        console.log('Token refreshed and saved successfully')
      } catch (refreshErr) {
        console.error('Token refresh error:', refreshErr)
        return new Response(JSON.stringify({
          error: 'Session expired, please reconnect your calendar',
          code: 'TOKEN_EXPIRED'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Build event start/end times
    const startDateTime = `${eventDate}T${eventTime}:00`
    const durationMinutes = duration || 30
    const endDateTime = new Date(new Date(startDateTime).getTime() + durationMinutes * 60000)
      .toISOString()
      .slice(0, 19)

    const eventTitle = `${resourceTitle} - Surgical Technique Review`
    const eventDescription = `
${resourceDescription || 'Review surgical technique resource'}

Resource: ${resourceTitle}
Link: ${resourceUrl}

${notes ? `Notes: ${notes}` : ''}

---
Created via Surgical Techniques App
View resource: ${resourceUrl}
    `.trim()

    let calendarResponse: Response
    if (provider === 'microsoft') {
      const msEventData = {
        subject: eventTitle,
        body: {
          contentType: 'text',
          content: eventDescription
        },
        start: {
          dateTime: startDateTime,
          timeZone: timezone || 'America/Los_Angeles'
        },
        end: {
          dateTime: endDateTime,
          timeZone: timezone || 'America/Los_Angeles'
        },
        isReminderOn: true,
        reminderMinutesBeforeStart: 60
      }

      console.log('Creating event in Microsoft Outlook Calendar')

      calendarResponse = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(msEventData)
      })
    } else {
      const googleEventData = {
        summary: eventTitle,
        description: eventDescription,
        start: {
          dateTime: startDateTime,
          timeZone: timezone || 'America/Los_Angeles'
        },
        end: {
          dateTime: endDateTime,
          timeZone: timezone || 'America/Los_Angeles'
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 24 * 60 },
            { method: 'popup', minutes: 60 }
          ]
        }
      }

      console.log('Creating event in Google Calendar')

      calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${connection.calendar_id}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(googleEventData)
        }
      )
    }

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.json()
      console.error('Calendar API error:', errorData)
      return new Response(JSON.stringify({
        error: 'Failed to create calendar event',
        code: 'API_ERROR',
        details: errorData
      }), {
        status: calendarResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const createdEvent = await calendarResponse.json()
    console.log('Event created successfully:', createdEvent.id)

    // Microsoft uses .webLink, Google uses .htmlLink
    const eventUrl = provider === 'microsoft' ? createdEvent.webLink : createdEvent.htmlLink

    const { error: trackingError } = await supabase
      .from('calendar_events')
      .insert({
        user_id: user.id,
        resource_id: resourceId,
        provider,
        external_event_id: createdEvent.id,
        calendar_id: connection.calendar_id,
        event_title: eventTitle,
        event_start: startDateTime,
        event_end: endDateTime,
        event_notes: notes,
        event_url: eventUrl
      })

    if (trackingError) {
      console.warn('Failed to track event (non-blocking):', trackingError)
    }

    return new Response(JSON.stringify({
      success: true,
      eventId: createdEvent.id,
      eventUrl,
      calendarLink: provider === 'microsoft'
        ? eventUrl
        : `https://calendar.google.com/calendar/r/eventedit/${createdEvent.id}`
    }), {
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
