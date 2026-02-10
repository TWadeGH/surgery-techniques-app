// Google OAuth Callback - Edge Function
// Handles OAuth callback from Google, exchanges code for tokens, stores in database

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encryptToken } from '../_shared/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables (secrets)
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || ''
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || ''
    const APP_URL = Deno.env.get('APP_URL') || 'https://surgicaltechniques.app'
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://bufnygjdkdemacqbxcrh.supabase.co'
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const TOKEN_ENCRYPTION_KEY = Deno.env.get('TOKEN_ENCRYPTION_KEY') || ''

    if (!TOKEN_ENCRYPTION_KEY) {
      console.error('TOKEN_ENCRYPTION_KEY secret is not set')
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${APP_URL}/settings?calendar=error&reason=server_config_error`
        }
      })
    }

    // Debug logging
    console.log('=== ENV DEBUG ===')
    console.log('APP_URL:', APP_URL)
    console.log('SUPABASE_URL:', SUPABASE_URL)
    console.log('GOOGLE_CLIENT_ID exists:', !!GOOGLE_CLIENT_ID)
    console.log('TOKEN_ENCRYPTION_KEY exists:', !!TOKEN_ENCRYPTION_KEY)
    console.log('==================')

    // Parse URL parameters
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    // Handle OAuth errors (user denied permission, etc.)
    if (error) {
      console.error('OAuth error:', error)
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${APP_URL}/settings?calendar=error&reason=${error}`
        }
      })
    }

    // Validate required parameters
    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing authorization code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // TODO: Validate state parameter for CSRF protection (Phase 2 enhancement)

    console.log('Exchanging code for tokens...')

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${SUPABASE_URL}/functions/v1/google-oauth-callback`,
        grant_type: 'authorization_code'
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${APP_URL}/settings?calendar=error&reason=token_exchange_failed`
        }
      })
    }

    const tokens = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokens

    console.log('Tokens received, fetching calendar info...')

    // Get user's primary calendar
    const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${access_token}` }
    })

    if (!calendarResponse.ok) {
      const calendarError = await calendarResponse.text()
      console.error('Failed to fetch calendar list. Status:', calendarResponse.status)
      console.error('Calendar API error:', calendarError)
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${APP_URL}/settings?calendar=error&reason=calendar_fetch_failed`
        }
      })
    }

    const { items: calendars } = await calendarResponse.json()
    const primaryCalendar = calendars.find((cal: any) => cal.primary)

    if (!primaryCalendar) {
      console.error('No primary calendar found')
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${APP_URL}/settings?calendar=error&reason=no_primary_calendar`
        }
      })
    }

    console.log('Primary calendar found:', primaryCalendar.id)

    // Get user ID from state parameter (we pass it during OAuth initiation)
    // State format: "userId:randomUUID" for CSRF protection
    const userId = state?.split(':')[0]
    if (!userId) {
      console.error('No user ID in state parameter')
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${APP_URL}/settings?calendar=error&reason=auth_failed`
        }
      })
    }

    console.log('User ID from state:', userId)

    // Encrypt tokens with AES-256-GCM
    console.log('Encrypting tokens...')
    const [encryptedAccess, encryptedRefresh] = await Promise.all([
      encryptToken(access_token, TOKEN_ENCRYPTION_KEY),
      encryptToken(refresh_token || '', TOKEN_ENCRYPTION_KEY)
    ])
    console.log('Tokens encrypted successfully')

    // Create Supabase client with service role key (needed to write to DB without user auth)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    console.log('Storing connection for user:', userId)

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + (expires_in * 1000))

    console.log('Storing connection...')

    // Store connection with encrypted tokens
    const { error: dbError } = await supabase
      .from('user_calendar_connections')
      .upsert({
        user_id: userId,
        provider: 'google',
        access_token_encrypted: encryptedAccess.ciphertext,
        access_token_iv: encryptedAccess.iv,
        refresh_token_encrypted: encryptedRefresh.ciphertext,
        refresh_token_iv: encryptedRefresh.iv,
        token_expires_at: tokenExpiresAt.toISOString(),
        calendar_id: primaryCalendar.id,
        calendar_email: primaryCalendar.id,
        calendar_name: primaryCalendar.summary || primaryCalendar.id,
        last_synced_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,provider'
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${APP_URL}/settings?calendar=error&reason=database_error`
        }
      })
    }

    console.log('Connection stored successfully with encrypted tokens!')

    // Redirect back to app with success
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `${APP_URL}/settings?calendar=connected&provider=google`
      }
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
