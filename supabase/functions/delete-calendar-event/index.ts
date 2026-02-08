// Delete Calendar Event - Edge Function
// Deletes a calendar event from user's Google Calendar and database

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
    const { eventId } = await req.json()

    if (!eventId) {
      return new Response(JSON.stringify({ error: 'Missing eventId' }), {
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

    console.log('Deleting calendar event:', eventId, 'for user:', user.id)

    // Get event details from database
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', eventId)
      .eq('user_id', user.id)
      .single()

    if (eventError || !event) {
      return new Response(JSON.stringify({
        error: 'Event not found or unauthorized',
        code: 'NOT_FOUND'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get calendar connection
    const { data: connection, error: connectionError } = await supabase
      .from('user_calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', event.provider)
      .single()

    if (connectionError || !connection) {
      console.warn('Calendar connection not found, deleting from database only')
      // Still delete from our database even if connection is gone
    } else {
      // Check if token is expired
      const tokenExpiry = new Date(connection.token_expires_at)
      const now = new Date()
      const accessToken = connection.access_token_encrypted // TODO: Decrypt in Phase 2

      // If token expires in < 5 minutes, skip Google API call
      if (tokenExpiry.getTime() - now.getTime() < 5 * 60 * 1000) {
        console.warn('Token expired, skipping Google API deletion')
      } else {
        // Delete event from Google Calendar
        try {
          const calendarResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${connection.calendar_id}/events/${event.external_event_id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          )

          if (!calendarResponse.ok && calendarResponse.status !== 404) {
            const errorData = await calendarResponse.json().catch(() => ({}))
            console.error('Google Calendar API error:', errorData)
            // Continue with database deletion even if API call fails
          } else {
            console.log('Event deleted from Google Calendar successfully')
          }
        } catch (apiError) {
          console.error('Failed to delete from Google Calendar (non-blocking):', apiError)
          // Continue with database deletion
        }
      }
    }

    // Delete event from database
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

    return new Response(JSON.stringify({
      success: true,
      message: 'Calendar event deleted successfully'
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
