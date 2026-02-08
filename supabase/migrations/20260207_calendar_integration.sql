-- =====================================================
-- Calendar Integration - Database Schema
-- =====================================================
-- Created: 2026-02-07
-- Purpose: Enable users to connect Google Calendar and Microsoft Outlook
--          to schedule surgical technique resources as calendar events
-- =====================================================

-- =====================================================
-- Table: user_calendar_connections
-- =====================================================
-- Stores encrypted OAuth tokens for user calendar connections
-- Each user can have one connection per provider (Google, Microsoft)

CREATE TABLE IF NOT EXISTS user_calendar_connections (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference (cascade delete when user is deleted)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Provider information
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  provider_user_id TEXT, -- Google/Microsoft user ID for verification

  -- Encrypted OAuth tokens
  -- IMPORTANT: These should be encrypted at rest using Supabase Vault or application-level encryption
  -- For now, storing as TEXT - encryption will be added in Phase 2
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Calendar details
  calendar_id TEXT NOT NULL, -- Primary calendar ID from provider
  calendar_email TEXT, -- Email associated with the calendar
  calendar_name TEXT, -- User-friendly calendar name (e.g., "john.doe@gmail.com")

  -- Metadata
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ, -- Last time we successfully called the calendar API
  last_refresh_at TIMESTAMPTZ, -- Last time we refreshed the access token

  -- Timestamps (standard pattern from existing tables)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  -- Each user can only have one connection per provider
  UNIQUE(user_id, provider)
);

-- =====================================================
-- Table: calendar_events
-- =====================================================
-- Optional: Tracks calendar events created from the app
-- Useful for analytics, debugging, and potential future sync features

CREATE TABLE IF NOT EXISTS calendar_events (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,

  -- Calendar details
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  external_event_id TEXT NOT NULL, -- Event ID from Google/Microsoft API
  calendar_id TEXT NOT NULL, -- Which calendar the event was created in

  -- Event details (snapshot at creation time)
  event_title TEXT NOT NULL,
  event_start TIMESTAMPTZ NOT NULL,
  event_end TIMESTAMPTZ NOT NULL,
  event_notes TEXT,
  event_url TEXT, -- Link to view event in Google Calendar or Outlook

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: Each external event should be unique per provider
  UNIQUE(provider, external_event_id)
);

-- =====================================================
-- Indexes
-- =====================================================

-- Index for finding connections by user (most common query)
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user
  ON user_calendar_connections(user_id);

-- Index for finding expired tokens (background job to refresh tokens)
CREATE INDEX IF NOT EXISTS idx_calendar_connections_expiry
  ON user_calendar_connections(token_expires_at)
  WHERE token_expires_at IS NOT NULL;

-- Index for finding connections by provider
CREATE INDEX IF NOT EXISTS idx_calendar_connections_provider
  ON user_calendar_connections(provider);

-- Index for calendar_events by user
CREATE INDEX IF NOT EXISTS idx_calendar_events_user
  ON calendar_events(user_id);

-- Index for calendar_events by resource
CREATE INDEX IF NOT EXISTS idx_calendar_events_resource
  ON calendar_events(resource_id);

-- Index for calendar_events by creation date
CREATE INDEX IF NOT EXISTS idx_calendar_events_created
  ON calendar_events(created_at DESC);

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_calendar_connections
DROP TRIGGER IF EXISTS set_updated_at ON user_calendar_connections;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON user_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE user_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies: user_calendar_connections
-- =====================================================

-- Policy: Users can view their own calendar connections
CREATE POLICY "Users can view own calendar connections"
  ON user_calendar_connections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own calendar connections
CREATE POLICY "Users can insert own calendar connections"
  ON user_calendar_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own calendar connections
CREATE POLICY "Users can update own calendar connections"
  ON user_calendar_connections
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own calendar connections
CREATE POLICY "Users can delete own calendar connections"
  ON user_calendar_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS Policies: calendar_events
-- =====================================================

-- Policy: Users can view their own calendar events
CREATE POLICY "Users can view own calendar events"
  ON calendar_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own calendar events
CREATE POLICY "Users can insert own calendar events"
  ON calendar_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own calendar events (if we add event deletion)
CREATE POLICY "Users can delete own calendar events"
  ON calendar_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- Comments (PostgreSQL documentation)
-- =====================================================

COMMENT ON TABLE user_calendar_connections IS
  'Stores OAuth tokens for user calendar connections (Google, Microsoft). Tokens should be encrypted at rest.';

COMMENT ON COLUMN user_calendar_connections.access_token_encrypted IS
  'Encrypted OAuth access token. Valid for ~1 hour, automatically refreshed.';

COMMENT ON COLUMN user_calendar_connections.refresh_token_encrypted IS
  'Encrypted OAuth refresh token. Used to obtain new access tokens without re-authentication.';

COMMENT ON COLUMN user_calendar_connections.token_expires_at IS
  'Timestamp when the access token expires. Tokens should be refreshed before this time.';

COMMENT ON TABLE calendar_events IS
  'Tracks calendar events created from the app. Optional table for analytics and debugging.';

COMMENT ON COLUMN calendar_events.external_event_id IS
  'Event ID from Google Calendar API or Microsoft Graph API. Used to update/delete events.';

-- =====================================================
-- Verification Queries (for testing after migration)
-- =====================================================

-- Run these queries after migration to verify everything is set up correctly:

-- 1. Check tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('user_calendar_connections', 'calendar_events');

-- 2. Check RLS is enabled:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('user_calendar_connections', 'calendar_events');

-- 3. Check policies exist:
-- SELECT tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename IN ('user_calendar_connections', 'calendar_events');

-- 4. Check indexes exist:
-- SELECT indexname, tablename
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND tablename IN ('user_calendar_connections', 'calendar_events');

-- =====================================================
-- Migration Complete
-- =====================================================
