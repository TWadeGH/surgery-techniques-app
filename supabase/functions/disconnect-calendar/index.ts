// Disconnect Calendar - Edge Function
// Removes calendar connection and cleans up tokens

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
    const { provider } = await req.json()

    if (!provider) {
      return new Response(JSON.stringify({ error: 'Missing provider' }), {
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

    console.log('Disconnecting calendar for user:', user.id, 'provider:', provider)

    // Optional: Revoke token with Google (best practice)
    // Get connection first
    const { data: connection } = await supabase
      .from('user_calendar_connections')
      .select('access_token_encrypted')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single()

    if (connection && provider === 'google') {
      try {
        // Revoke Google token
        await fetch(`https://oauth2.googleapis.com/revoke?token=${connection.access_token_encrypted}`, {
          method: 'POST'
        })
        console.log('Token revoked with Google')
      } catch (error) {
        console.warn('Failed to revoke token (non-blocking):', error)
      }
    }

    // Delete connection from database
    const { error: deleteError } = await supabase
      .from('user_calendar_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider)

    if (deleteError) {
      console.error('Database error:', deleteError)
      return new Response(JSON.stringify({
        error: 'Failed to disconnect calendar',
        details: deleteError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Calendar disconnected successfully')

    return new Response(JSON.stringify({
      success: true,
      message: 'Calendar disconnected successfully'
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
