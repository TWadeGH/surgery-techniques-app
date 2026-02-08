// Create Calendar Event - Edge Function
// Creates a calendar event in user's Google Calendar

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse request body
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

    // Validate required fields
    if (!provider || !resourceId || !eventDate || !eventTime) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        required: ['provider', 'resourceId', 'eventDate', 'eventTime']
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Creating calendar event for user:', user.id)

    // Get calendar connection
    const { data: connection, error: connectionError } = await supabase
      .from('user_calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single()

    if (connectionError || !connection) {
      return new Response(JSON.stringify({
        error: 'Calendar not connected',
        code: 'NOT_CONNECTED'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if token is expired
    const tokenExpiry = new Date(connection.token_expires_at)
    const now = new Date()

    let accessToken = connection.access_token_encrypted // TODO: Decrypt in Phase 2

    // If token expires in < 5 minutes, refresh it
    if (tokenExpiry.getTime() - now.getTime() < 5 * 60 * 1000) {
      console.log('Token expiring soon, refreshing...')
      // TODO: Call refresh-calendar-token function
      // For now, return error asking user to reconnect
      return new Response(JSON.stringify({
        error: 'Token expired, please reconnect your calendar',
        code: 'TOKEN_EXPIRED'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Build event start/end times
    const startDateTime = `${eventDate}T${eventTime}:00`
    const durationMinutes = duration || 30
    const endDateTime = new Date(new Date(startDateTime).getTime() + durationMinutes * 60000)
      .toISOString()
      .slice(0, 16)

    // Build event data
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

    const eventData = {
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
          { method: 'popup', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 }        // 1 hour before
        ]
      }
    }

    console.log('Creating event in Google Calendar:', eventData)

    // Create event via Google Calendar API
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${connection.calendar_id}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      }
    )

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.json()
      console.error('Google Calendar API error:', errorData)
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

    // Store event in calendar_events table (optional, for tracking)
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
        event_url: createdEvent.htmlLink
      })

    if (trackingError) {
      console.warn('Failed to track event (non-blocking):', trackingError)
    }

    // Return success
    return new Response(JSON.stringify({
      success: true,
      eventId: createdEvent.id,
      eventUrl: createdEvent.htmlLink,
      calendarLink: `https://calendar.google.com/calendar/r/eventedit/${createdEvent.id}`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
