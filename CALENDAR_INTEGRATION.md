# Calendar Integration - Implementation Guide

## Overview

This document tracks the implementation of calendar integration features, allowing users to schedule surgical technique reviews directly to their Google Calendar (with Microsoft Outlook planned next).

---

## ✅ Completed - Google Calendar Integration

### Database Schema

Created tables for calendar connections and events:

```sql
-- Stores OAuth connections to calendar providers
CREATE TABLE user_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ NOT NULL,
  calendar_id TEXT NOT NULL,
  calendar_email TEXT,
  calendar_name TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  UNIQUE(user_id, provider)
);

-- Stores calendar events created by users
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  calendar_connection_id UUID NOT NULL REFERENCES user_calendar_connections(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  external_event_id TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_start TIMESTAMPTZ NOT NULL,
  event_end TIMESTAMPTZ NOT NULL,
  reminder_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource_id, provider)
);
```

### Frontend Components

**1. Calendar Connection Hook (`src/hooks/useCalendarConnection.js`)**
- Manages OAuth flow for connecting calendars
- Handles disconnection
- Checks connection status

**2. Calendar Events Hook (`src/hooks/useCalendarEvents.js`)**
- Loads upcoming events for a user
- Creates new calendar events
- Deletes calendar events
- Filters to only show upcoming events

**3. Calendar Event Modal (`src/components/modals/CalendarEventModal.jsx`)**
- UI for scheduling technique reviews
- Date picker (defaults to tomorrow)
- Time picker (defaults to 7:30 AM)
- Reminder dropdown (defaults to 1 day before)
- Shows user's personal notes for context

**4. Calendar Button on Resource Cards (`src/components/resources/ResourceCard.jsx`)**
- Empty calendar icon when not scheduled
- Filled green calendar icon with delete button when scheduled
- Only visible when calendar is connected

### Edge Functions

**1. `google-oauth-callback`**
- Handles OAuth redirect from Google
- Exchanges authorization code for access/refresh tokens
- Fetches user's primary calendar
- Stores connection in database
- Extracts user ID from state parameter

**2. `create-calendar-event`**
- Creates calendar events via Google Calendar API
- Detects user's timezone automatically
- Sets reminder notifications
- Stores event reference in database

**3. `delete-calendar-event`**
- Deletes events from Google Calendar
- Removes event from database
- Handles expired tokens gracefully

**4. `disconnect-calendar`**
- Revokes OAuth tokens
- Removes connection from database
- Cleans up associated events

### Google Cloud Console Setup

**Required Steps:**
1. Create OAuth 2.0 credentials
2. **Enable Google Calendar API** (critical step!)
3. Configure OAuth consent screen
4. Add authorized redirect URIs:
   - `https://bufnygjdkdemacqbxcrh.supabase.co/functions/v1/google-oauth-callback`
   - `http://localhost:5176/auth/google/callback` (for local dev)
5. Add test users (while in Testing mode)

**Scopes Required:**
- `https://www.googleapis.com/auth/calendar.events` - Create/modify events
- `https://www.googleapis.com/auth/calendar.readonly` - List calendars

### Supabase Edge Function Secrets

Set these in Supabase Dashboard → Edge Functions → Secrets:

```
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
APP_URL=https://surgicaltechniques.app
SUPABASE_URL=https://bufnygjdkdemacqbxcrh.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

**Important:** Ensure `APP_URL` value is just the URL without any `APP_URL=` prefix!

### Key Features

- ✅ OAuth 2.0 flow with Google
- ✅ Connect/disconnect calendar
- ✅ Create events with custom date/time/reminder
- ✅ Delete events
- ✅ Automatic timezone detection
- ✅ User's personal notes included in event description
- ✅ Only shows upcoming events (past events filtered out)
- ✅ Optimistic UI updates
- ✅ Calendar icon on resource cards shows scheduled status

### User Flow

1. User goes to Settings → Calendar Integration
2. Clicks "Connect Google Calendar"
3. OAuth flow redirects to Google for authorization
4. User grants permissions (view calendars + manage events)
5. Google redirects back to Supabase Edge Function
6. Edge Function stores connection in database
7. User is redirected back to app with success message
8. Calendar icon now appears on all resource cards
9. User clicks calendar icon on a resource
10. Modal opens with scheduling options (date/time/reminder)
11. User schedules the review
12. Event is created in Google Calendar with notes
13. Calendar icon turns green/filled to show it's scheduled
14. User can click again to delete the event

---

## 🔄 In Progress - Known Issues & TODOs

### Security Enhancements (Phase 2)

**Token Encryption:**
- Currently storing OAuth tokens as plaintext in database
- TODO: Encrypt tokens using Supabase Vault
- Files to update: All Edge Functions that store/retrieve tokens

**CSRF Protection:**
- State parameter is generated but not validated
- TODO: Validate state on OAuth callback
- File: `supabase/functions/google-oauth-callback/index.ts`

### Token Refresh Logic

**Current Limitation:**
- Access tokens expire after 1 hour
- No automatic refresh implemented
- Events fail silently if token expires

**TODO:**
- Implement token refresh in Edge Functions
- Check `token_expires_at` before API calls
- Use `refresh_token` to get new `access_token`
- Update `user_calendar_connections` with new token/expiry

**Files to update:**
- `supabase/functions/create-calendar-event/index.ts`
- `supabase/functions/delete-calendar-event/index.ts`

### Error Handling Improvements

**TODO:**
- Better error messages to user (currently just generic "failed")
- Handle specific Google API errors (quota exceeded, calendar deleted, etc.)
- Retry logic for transient failures
- Logging improvements for debugging

---

## 📋 Next Steps - Microsoft Outlook Integration

### Overview

Add Microsoft Outlook/Office 365 calendar support following the same pattern as Google.

### Microsoft Azure Setup

1. **Register App in Azure Portal**
   - Go to https://portal.azure.com
   - Azure Active Directory → App registrations → New registration
   - Name: "Surgical Techniques Calendar"
   - Redirect URI: `https://bufnygjdkdemacqbxcrh.supabase.co/functions/v1/microsoft-oauth-callback`

2. **Configure API Permissions**
   - Microsoft Graph API permissions needed:
     - `Calendars.ReadWrite` (delegate)
     - `offline_access` (to get refresh token)
   - Grant admin consent

3. **Create Client Secret**
   - Certificates & secrets → New client secret
   - Save the secret value (only shown once!)

### Database Changes

**No schema changes needed** - tables already support `provider='microsoft'`

### Edge Functions to Create

**1. `microsoft-oauth-callback`**
```typescript
// Similar to google-oauth-callback
// Uses Microsoft Graph API OAuth endpoints
// Token endpoint: https://login.microsoftonline.com/common/oauth2/v2.0/token
// Calendar API: https://graph.microsoft.com/v1.0/me/calendars
```

**2. `create-calendar-event` (Update)**
```typescript
// Add Microsoft Graph API support
// Endpoint: POST https://graph.microsoft.com/v1.0/me/events
// Handle different event format than Google
```

**3. `delete-calendar-event` (Update)**
```typescript
// Add Microsoft Graph API support
// Endpoint: DELETE https://graph.microsoft.com/v1.0/me/events/{id}
```

**4. `disconnect-calendar` (Update)**
```typescript
// Handle Microsoft token revocation
// May not have explicit revoke endpoint (tokens just expire)
```

### Frontend Changes

**1. Update `useCalendarConnection.js`**
```javascript
// Add connectMicrosoft() function
// OAuth URL: https://login.microsoftonline.com/common/oauth2/v2.0/authorize
// Scopes: Calendars.ReadWrite offline_access
```

**2. Update Settings UI**
```javascript
// Add "Connect Microsoft Outlook" button
// Show both Google and Microsoft connection status
// Allow connecting both providers simultaneously
```

**3. Update Calendar Modal**
```javascript
// If user has both calendars connected, show provider selector
// Allow choosing which calendar to add event to
```

### Microsoft Graph API Differences

| Feature | Google Calendar | Microsoft Graph |
|---------|----------------|-----------------|
| OAuth Endpoint | accounts.google.com | login.microsoftonline.com |
| Token Endpoint | oauth2.googleapis.com | login.microsoftonline.com/common/oauth2/v2.0/token |
| Calendar List | calendar/v3/users/me/calendarList | graph.microsoft.com/v1.0/me/calendars |
| Create Event | calendar/v3/calendars/{id}/events | graph.microsoft.com/v1.0/me/events |
| Delete Event | calendar/v3/calendars/{id}/events/{eventId} | graph.microsoft.com/v1.0/me/events/{id} |
| Token Expiry | 1 hour | 1 hour |
| Refresh Token | Persistent (if offline_access used) | Persistent (if offline_access used) |

### Implementation Phases

**Phase 1: OAuth Connection**
- [ ] Create Microsoft OAuth callback Edge Function
- [ ] Update frontend to support Microsoft OAuth
- [ ] Test connection flow
- [ ] Store Microsoft connection in database

**Phase 2: Create Events**
- [ ] Update create-calendar-event Edge Function for Microsoft
- [ ] Handle Microsoft event format
- [ ] Test event creation

**Phase 3: Delete & Disconnect**
- [ ] Update delete Edge Function for Microsoft
- [ ] Update disconnect Edge Function for Microsoft
- [ ] Test deletion and disconnection

**Phase 4: Multi-Provider UI**
- [ ] Update modal to support provider selection
- [ ] Show both connection statuses
- [ ] Handle edge cases (both connected, only one, etc.)

---

## 🔐 Security Considerations

### Token Storage
- **Current:** Plaintext in database (NOT SECURE for production)
- **Planned:** Encrypt using Supabase Vault or external KMS
- **Why:** OAuth tokens grant full calendar access

### CSRF Protection
- **Current:** State parameter generated but not validated
- **Planned:** Store state in session, validate on callback
- **Why:** Prevent token theft via malicious redirects

### Token Scopes
- **Principle:** Request minimum necessary permissions
- **Google:** Only `calendar.events` and `calendar.readonly`
- **Microsoft:** Only `Calendars.ReadWrite`
- **Why:** Limit damage if tokens compromised

### Rate Limiting
- **Current:** None
- **Planned:** Rate limit Edge Function invocations per user
- **Why:** Prevent abuse/DoS via repeated API calls

### Token Refresh
- **Current:** No automatic refresh
- **Risk:** Events fail after 1 hour
- **Planned:** Automatic refresh before API calls
- **Why:** Better UX, fewer failures

---

## 📊 Analytics & Monitoring

### Metrics to Track

- Calendar connection rate (% of users who connect)
- Events created per user
- Event deletion rate
- OAuth success/failure rate
- API error types
- Token expiry incidents

### Logging

**Current Logging:**
- Edge Function invocations
- OAuth errors
- API failures
- Token exchange issues

**Recommended:**
- Structured logging (JSON format)
- Log aggregation service (e.g., Logtail, Datadog)
- Alerting for critical errors (OAuth failures, API quota exceeded)

---

## 🚀 Deployment Checklist

### Before Going Live

- [ ] Enable Google Calendar API in Google Cloud Console
- [ ] Set all Supabase Edge Function secrets correctly
- [ ] Verify redirect URIs match in Google Cloud Console
- [ ] Test OAuth flow end-to-end
- [ ] Test event creation, deletion, disconnection
- [ ] Verify RLS policies on calendar tables
- [ ] Add database indexes for performance
- [ ] Implement token encryption (Phase 2)
- [ ] Add CSRF validation (Phase 2)
- [ ] Set up monitoring/alerting
- [ ] Document for users (help text, FAQ)
- [ ] Test on production domain
- [ ] Publish Google OAuth app (if needed for public users)

### Performance Optimization

**Database Indexes:**
```sql
CREATE INDEX idx_calendar_events_user_upcoming
  ON calendar_events(user_id, event_start)
  WHERE event_start >= NOW();

CREATE INDEX idx_calendar_connections_user_provider
  ON user_calendar_connections(user_id, provider);
```

**Edge Function Optimization:**
- Cache calendar list (reduce API calls)
- Batch event creation if needed
- Optimize token refresh logic

---

## 🆘 Troubleshooting

### "Failed to fetch calendar list"
- **Cause:** Google Calendar API not enabled
- **Fix:** Enable API in Google Cloud Console
- **Prevention:** Add to setup checklist

### Malformed redirect URL
- **Cause:** `APP_URL` secret has wrong format
- **Fix:** Ensure value is just the URL (no `APP_URL=` prefix)
- **Prevention:** Better secret validation

### OAuth doesn't complete
- **Cause:** Redirect URI mismatch
- **Fix:** Verify redirect URIs in Google Cloud Console match exactly
- **Prevention:** Document exact URIs needed

### Events fail to create after 1 hour
- **Cause:** Access token expired
- **Fix:** Implement token refresh
- **Prevention:** Add token refresh logic to Edge Functions

### User sees wrong timezone
- **Cause:** Browser timezone detection failed
- **Fix:** Allow manual timezone selection
- **Prevention:** Add timezone selector to modal

---

## 📚 Resources

### Documentation
- [Google Calendar API](https://developers.google.com/calendar/api/v3/reference)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft Graph Calendar API](https://learn.microsoft.com/en-us/graph/api/resources/calendar)
- [Microsoft OAuth 2.0](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

### Code References
- Main integration code: commits 928be8b, 0183908, fc326dc, a42d3dc
- Frontend hooks: `src/hooks/useCalendarConnection.js`, `src/hooks/useCalendarEvents.js`
- Edge Functions: `supabase/functions/google-oauth-callback/`, etc.

---

## 🤝 Contributors

Calendar integration implemented with assistance from Claude Code (Sonnet 4.5/Opus 4.5).

---

**Last Updated:** February 8, 2026
