# Calendar Integration Implementation Plan

**Last Updated:** 2026-02-07
**Status:** Planning
**Owner:** TWH Systems, LLC

---

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Technical Architecture](#technical-architecture)
4. [Security Model](#security-model)
5. [Database Schema](#database-schema)
6. [OAuth Implementation](#oauth-implementation)
7. [UI/UX Specifications](#uiux-specifications)
8. [Implementation Phases](#implementation-phases)
9. [Testing Strategy](#testing-strategy)
10. [Error Handling](#error-handling)
11. [Future Enhancements](#future-enhancements)

---

## Overview

Enable users to connect their Google Calendar and/or Microsoft Outlook calendars to schedule surgical technique resources as calendar events. Users can add resources to their calendar with custom date/time, creating a personal surgical planning workflow.

### Key Features

- **Calendar Connection:** OAuth2 integration with Google and Microsoft
- **Add to Calendar:** One-click button on resource cards
- **Event Creation:** Automatic calendar event creation with resource details
- **Token Management:** Secure, encrypted token storage with automatic refresh
- **Multiple Calendars:** Support both Google and Microsoft simultaneously

### User Value

- Plan surgical cases with technique review built into their schedule
- Get calendar reminders for technique preparation
- Professional workflow integration (calendar = ground truth for surgeons)
- Seamless experience (no manual .ics downloads)

---

## Requirements

### Functional Requirements

**FR-1: Calendar Connection**
- Users can connect Google Calendar via OAuth2
- Users can connect Microsoft Outlook via OAuth2
- Users can disconnect calendars at any time
- Users can see connection status in Settings
- System stores encrypted access/refresh tokens

**FR-2: Add to Calendar**
- "Add to Calendar" button appears on resource cards when calendar connected
- Clicking opens modal to select date/time
- User can add optional notes
- Event created automatically in connected calendar(s)
- Success/error feedback shown to user

**FR-3: Calendar Events**
- Event title: "[Resource Title] - Surgical Technique Review"
- Event description: Resource description + direct link to resource + app link
- Event date/time: User-selected
- Event duration: Configurable (default 30 min)
- Event reminders: 1 day before, 1 hour before
- Optional location field

**FR-4: Token Management**
- Access tokens refreshed automatically before expiry
- Refresh tokens stored securely (encrypted at rest)
- Expired tokens trigger re-authentication flow
- Token revocation on disconnect

### Non-Functional Requirements

**NFR-1: Security**
- OAuth tokens encrypted at rest using Supabase Vault
- Row Level Security policies on calendar_connections table
- No tokens exposed in client-side code
- HTTPS-only for all OAuth flows

**NFR-2: Performance**
- Calendar event creation completes within 3 seconds
- Token refresh happens in background (no user wait)
- UI remains responsive during API calls

**NFR-3: Reliability**
- Token refresh retry logic (3 attempts with exponential backoff)
- Graceful degradation if calendar API unavailable
- Clear error messages for user action

**NFR-4: Usability**
- Mobile-responsive calendar connection flow
- Clear visual indication of connection status
- One-click disconnect with confirmation

---

## Technical Architecture

### High-Level Flow

```
User Action Flow:
1. Settings → Connect Calendar → Choose Provider → OAuth Flow → Tokens Stored
2. Resource Card → Add to Calendar → Date/Time Picker → Event Created

System Components:
- Frontend (React): UI for connection, event creation
- Supabase Edge Functions: OAuth callbacks, token refresh, event creation
- Supabase Database: Encrypted token storage
- External APIs: Google Calendar API, Microsoft Graph API
```

### Component Breakdown

**Frontend Components:**
- `CalendarConnectionSection` - In SettingsModal, shows connection status
- `ConnectCalendarButton` - Initiates OAuth flow for provider
- `AddToCalendarButton` - On ResourceCard, opens event creation modal
- `CalendarEventModal` - Date/time picker and event creation form
- `useCalendarConnection` - Custom hook for calendar state/operations

**Backend Components (Supabase Edge Functions):**
- `google-oauth-callback` - Handles Google OAuth redirect
- `microsoft-oauth-callback` - Handles Microsoft OAuth redirect
- `create-calendar-event` - Creates event via provider API
- `refresh-calendar-token` - Refreshes expired access tokens
- `disconnect-calendar` - Revokes tokens and cleans up

**Database:**
- `user_calendar_connections` - Stores encrypted tokens per user/provider
- RLS policies - Ensures users only access their own connections

---

## Security Model

### Phase 1: Security TDD (Pre-Implementation)

**Threat Model - Top 10 Vulnerabilities:**

1. **Token Leakage** - Access/refresh tokens exposed in client code or logs
2. **CSRF Attacks** - OAuth state parameter manipulation
3. **Token Theft** - Tokens stolen from database (encryption failure)
4. **Session Hijacking** - User A accesses User B's calendar
5. **Man-in-the-Middle** - OAuth redirect interception
6. **XSS Injection** - Malicious event data injected into calendar
7. **Excessive Permissions** - Requesting more calendar scopes than needed
8. **Token Persistence** - Tokens not revoked on disconnect
9. **Rate Limit Bypass** - Excessive API calls exhausting quotas
10. **Information Disclosure** - Error messages revealing token/API details

**"Break-it" Tests:**

```javascript
// Test 1: Token Leakage
- Attempt to access tokens via browser DevTools
- Check network requests for token exposure
- Verify tokens never appear in client-side state

// Test 2: CSRF Protection
- Manipulate OAuth state parameter
- Verify state validation in callback
- Ensure replay attacks fail

// Test 3: RLS Policy
- User A attempts to read User B's calendar_connections row
- Verify 403/404 response

// Test 4: Token Encryption
- Read database row directly
- Verify tokens are encrypted (not plaintext)
- Verify decryption only possible server-side

// Test 5: Scope Validation
- Verify only minimal calendar scopes requested
- No read access to emails, contacts, etc.

// Test 6: XSS Prevention
- Inject <script> tags in event notes
- Verify sanitization before calendar API call

// Test 7: Token Revocation
- Disconnect calendar in app
- Attempt to create event with old token
- Verify 401 Unauthorized

// Test 8: Expiry Handling
- Manually expire access token in DB
- Attempt calendar operation
- Verify automatic refresh or re-auth prompt

// Test 9: Rate Limiting
- Make 100 rapid "Add to Calendar" requests
- Verify rate limit enforcement (client-side debounce + server-side limit)

// Test 10: Error Sanitization
- Trigger Google/Microsoft API errors
- Verify user sees generic message (no token/API details)
```

**Edge Cases (50 total - key examples):**

1. User connects calendar, then revokes access in Google/Microsoft settings
2. Access token expires mid-request
3. Refresh token becomes invalid
4. User has no calendars in account
5. User has multiple calendars (which one to use?)
6. Timezone mismatch between user profile and calendar
7. Event creation fails due to calendar quota exceeded
8. Duplicate event creation (user clicks button twice)
9. User disconnects then immediately reconnects
10. OAuth callback receives error code instead of authorization code
11. Network timeout during token exchange
12. User closes browser during OAuth flow
13. Calendar API returns 503 (service unavailable)
14. Event date is in the past
15. Event date is > 1 year in the future
16. User has no internet connection
17. Supabase Edge Function cold start delays response
18. User connects calendar, logs out, logs back in
19. User deletes their Google/Microsoft account
20. OAuth redirect URL mismatch (dev vs production)
21. Null/undefined date selection
22. Invalid date string (e.g., "February 30")
23. Timezone string not recognized by API
24. Event title exceeds calendar provider's character limit
25. Event description with Unicode/emoji/special chars
26. User's calendar is read-only
27. User's calendar is deleted after connection
28. Multiple browser tabs trigger simultaneous OAuth flows
29. Token refresh happens during event creation
30. Database connection lost during token storage
31. User connects Google, then Microsoft, then disconnects Google
32. Calendar API changes response schema (breaking change)
33. User's calendar privacy settings block event creation
34. Event conflicts with existing calendar block
35. User's device clock is wrong (affects OAuth timestamp validation)
36. CORS issues with OAuth redirect
37. User clicks "Connect" but denies permissions in OAuth screen
38. Partial consent (user grants some but not all scopes)
39. User has 2FA enabled on calendar account
40. OAuth provider returns unexpected error code
41. Database migration runs while user is connecting calendar
42. User connects same provider twice (race condition)
43. Token encryption key rotation during active connection
44. User profile deleted but calendar_connection row orphaned
45. Calendar provider API quota exhausted (429 Too Many Requests)
46. Event creation succeeds but notification fails
47. User changes timezone in profile after connecting calendar
48. Resource URL becomes invalid/deleted after event created
49. Calendar event created but database update fails (consistency issue)
50. User has calendar access revoked by organization admin

### Security Best Practices

**Token Storage:**
- Use Supabase Vault for encryption keys
- Encrypt tokens with AES-256-GCM before storage
- Never log token values (mask in logs)
- Rotate encryption keys periodically

**OAuth Flow:**
- Use PKCE (Proof Key for Code Exchange) for additional security
- Generate cryptographically random state parameter
- Validate state on callback to prevent CSRF
- Enforce HTTPS for all redirect URLs

**API Calls:**
- All calendar API calls happen server-side (Edge Functions)
- Client never receives raw tokens
- Rate limit: max 10 calendar operations per user per minute
- Sanitize all user input before sending to calendar APIs

**RLS Policies:**
```sql
-- Users can only read their own connections
CREATE POLICY "Users can view own calendar connections"
  ON user_calendar_connections FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own connections
CREATE POLICY "Users can insert own calendar connections"
  ON user_calendar_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own connections
CREATE POLICY "Users can delete own calendar connections"
  ON user_calendar_connections FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Database Schema

### Table: `user_calendar_connections`

```sql
CREATE TABLE user_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Provider info
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  provider_user_id TEXT, -- Google/Microsoft user ID for verification

  -- Encrypted tokens (stored via Supabase Vault)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Calendar details
  calendar_id TEXT, -- Primary calendar ID
  calendar_email TEXT, -- Email associated with calendar
  calendar_name TEXT, -- User-friendly calendar name

  -- Metadata
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  last_refresh_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(user_id, provider),

  -- Indexes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token expiry checks
CREATE INDEX idx_calendar_connections_expiry
  ON user_calendar_connections(token_expires_at)
  WHERE token_expires_at IS NOT NULL;

-- Index for user lookups
CREATE INDEX idx_calendar_connections_user
  ON user_calendar_connections(user_id);

-- RLS Policies
ALTER TABLE user_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar connections"
  ON user_calendar_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar connections"
  ON user_calendar_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar connections"
  ON user_calendar_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar connections"
  ON user_calendar_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON user_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
```

### Table: `calendar_events` (Optional - for tracking)

```sql
-- Optional: Track events created in external calendars
-- Useful for analytics, debugging, and potential future sync features
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,

  -- Calendar details
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  external_event_id TEXT NOT NULL, -- Event ID from Google/Microsoft
  calendar_id TEXT NOT NULL,

  -- Event details
  event_title TEXT NOT NULL,
  event_start TIMESTAMPTZ NOT NULL,
  event_end TIMESTAMPTZ NOT NULL,
  event_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  UNIQUE(provider, external_event_id)
);

CREATE INDEX idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_resource ON calendar_events(resource_id);

-- RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar events"
  ON calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## OAuth Implementation

### Google Calendar OAuth

**OAuth Scopes Required:**
```
https://www.googleapis.com/auth/calendar.events
```
(Minimal scope - only create/read/update/delete events, not full calendar access)

**OAuth Flow:**

1. **Initiate:**
```javascript
// Client-side: Generate state and redirect to Google
const state = crypto.randomUUID(); // CSRF protection
const redirectUri = `${process.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-callback`;

const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
googleAuthUrl.searchParams.set('response_type', 'code');
googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events');
googleAuthUrl.searchParams.set('state', state);
googleAuthUrl.searchParams.set('access_type', 'offline'); // Get refresh token
googleAuthUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token

// Store state in session for validation
sessionStorage.setItem('oauth_state', state);

// Redirect
window.location.href = googleAuthUrl.toString();
```

2. **Callback (Edge Function):**
```javascript
// google-oauth-callback Edge Function
// Receives: code, state

// 1. Validate state parameter (CSRF protection)
// 2. Exchange code for tokens
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  })
});

const { access_token, refresh_token, expires_in } = await tokenResponse.json();

// 3. Get user's primary calendar
const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
  headers: { Authorization: `Bearer ${access_token}` }
});

const { items } = await calendarResponse.json();
const primaryCalendar = items.find(cal => cal.primary);

// 4. Encrypt tokens
const encryptedAccess = await encryptToken(access_token);
const encryptedRefresh = await encryptToken(refresh_token);

// 5. Store in database
await supabase.from('user_calendar_connections').upsert({
  user_id: userId,
  provider: 'google',
  access_token_encrypted: encryptedAccess,
  refresh_token_encrypted: encryptedRefresh,
  token_expires_at: new Date(Date.now() + expires_in * 1000),
  calendar_id: primaryCalendar.id,
  calendar_email: primaryCalendar.id,
  calendar_name: primaryCalendar.summary
});

// 6. Redirect back to app with success
return new Response(null, {
  status: 302,
  headers: { Location: `${APP_URL}/settings?calendar=connected` }
});
```

3. **Token Refresh:**
```javascript
// Automatic refresh when access_token expires
async function refreshGoogleToken(connectionId) {
  const { data: connection } = await supabase
    .from('user_calendar_connections')
    .select('refresh_token_encrypted')
    .eq('id', connectionId)
    .single();

  const refreshToken = await decryptToken(connection.refresh_token_encrypted);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token'
    })
  });

  const { access_token, expires_in } = await response.json();

  const encryptedAccess = await encryptToken(access_token);

  await supabase
    .from('user_calendar_connections')
    .update({
      access_token_encrypted: encryptedAccess,
      token_expires_at: new Date(Date.now() + expires_in * 1000),
      last_refresh_at: new Date()
    })
    .eq('id', connectionId);

  return access_token;
}
```

### Microsoft Outlook OAuth

**OAuth Scopes Required:**
```
Calendars.ReadWrite
```
(Minimal scope - read/write calendar events)

**OAuth Flow:**

1. **Initiate:**
```javascript
const state = crypto.randomUUID();
const redirectUri = `${process.env.VITE_SUPABASE_URL}/functions/v1/microsoft-oauth-callback`;

const msAuthUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
msAuthUrl.searchParams.set('client_id', MICROSOFT_CLIENT_ID);
msAuthUrl.searchParams.set('redirect_uri', redirectUri);
msAuthUrl.searchParams.set('response_type', 'code');
msAuthUrl.searchParams.set('scope', 'Calendars.ReadWrite offline_access');
msAuthUrl.searchParams.set('state', state);

sessionStorage.setItem('oauth_state', state);
window.location.href = msAuthUrl.toString();
```

2. **Callback (Edge Function):**
```javascript
// microsoft-oauth-callback Edge Function
// Similar to Google, but uses Microsoft Graph API

const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    code,
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    scope: 'Calendars.ReadWrite offline_access'
  })
});

// Get user's calendar
const calendarResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendar', {
  headers: { Authorization: `Bearer ${access_token}` }
});

// Rest similar to Google flow
```

**API Endpoints:**
- **Google:** https://www.googleapis.com/calendar/v3/
- **Microsoft:** https://graph.microsoft.com/v1.0/me/

---

## UI/UX Specifications

### Settings Modal - Calendar Connection Section

**Location:** SettingsModal (between Password and Specialty sections)

**Collapsed State:**
```
[📅] Connect Calendar
     Link your Google or Microsoft calendar to schedule resources
     [Chevron Down]
```

**Expanded State (No Connections):**
```
[📅] Connect Calendar
     Link your Google or Microsoft calendar to schedule resources
     [Chevron Up]

     Connect your calendar to easily schedule surgical technique resources
     for review before cases.

     [🔵 Connect Google Calendar]  [🔷 Connect Microsoft Outlook]
```

**Expanded State (Connected):**
```
[📅] Connected Calendars
     Your calendars are connected
     [Chevron Up]

     ✅ Google Calendar
        john.doe@gmail.com • Connected Jan 15, 2026
        [Disconnect]

     [🔷 Connect Microsoft Outlook]
```

**Expanded State (Both Connected):**
```
[📅] Connected Calendars
     Your calendars are connected
     [Chevron Up]

     ✅ Google Calendar
        john.doe@gmail.com • Connected Jan 15, 2026
        [Disconnect]

     ✅ Microsoft Outlook
        john.doe@hospital.org • Connected Jan 20, 2026
        [Disconnect]
```

### Resource Card - Add to Calendar Button

**Button Location:** Next to "Add to Upcoming Cases" button

**Visibility Logic:**
- Show ONLY if at least one calendar is connected
- If not connected: no button shown (or show grayed out with tooltip "Connect calendar in Settings")

**Button Design:**
```
[📅 Add to Calendar ▼]
```

**Dropdown (if multiple calendars connected):**
```
Add to Calendar
  → Google Calendar
  → Microsoft Outlook
  → Both Calendars
```

**Single Calendar:**
Click opens modal directly (no dropdown)

### Calendar Event Modal

**Trigger:** Click "Add to Calendar" button on resource card

**Modal Design:**
```
┌─────────────────────────────────────────────────┐
│ Add to Calendar                             [X] │
├─────────────────────────────────────────────────┤
│                                                 │
│ [Resource Preview Card]                         │
│ "ACL Reconstruction - Hamstring Autograft"      │
│                                                 │
│ Schedule this resource for:                     │
│                                                 │
│ Date                                            │
│ [Feb 15, 2026        📅]                        │
│                                                 │
│ Time                                            │
│ [2:00 PM             🕐] [30 minutes      ▼]   │
│                                                 │
│ Calendar                                        │
│ [Google Calendar     ▼]                         │
│                                                 │
│ Notes (Optional)                                │
│ [Right knee - review graft tensioning...     ]  │
│ [                                            ]  │
│                                                 │
│ Event Details:                                  │
│ • Title: ACL Reconstruction - Review            │
│ • Reminders: 1 day before, 1 hour before        │
│ • Resource link included in description         │
│                                                 │
│           [Cancel]  [Add to Calendar]           │
└─────────────────────────────────────────────────┘
```

**Field Specifications:**

- **Date Picker:**
  - Library: react-datepicker or native input type="date"
  - Min date: Today
  - Max date: 1 year from now
  - Default: Tomorrow

- **Time Picker:**
  - Library: react-datepicker time or native input type="time"
  - 15-minute increments
  - Default: 9:00 AM (start of typical OR day)

- **Duration:**
  - Dropdown: 15 min, 30 min, 1 hour, 2 hours
  - Default: 30 minutes

- **Calendar Selector:**
  - Dropdown if multiple calendars
  - Hidden if only one calendar
  - Shows calendar provider icon + email

- **Notes:**
  - Textarea, max 500 characters
  - Optional
  - Placeholder: "Add notes about this review session..."

**Validation:**
- Date cannot be in the past
- Time + Duration cannot end after midnight (warn if event spans multiple days)
- Notes sanitized (remove HTML/script tags)

**Loading State:**
```
[🔄 Adding to calendar...]
```

**Success State:**
```
✅ Added to [Calendar Name]!
   View in calendar: [Link]

   [Done]
```

**Error State:**
```
❌ Failed to add to calendar
   [Error message]

   [Try Again]  [Cancel]
```

### Mobile Responsive Design

**Resource Card Button (Mobile):**
```
[📅] (icon only, with tooltip on long-press)
```

**Modal (Mobile):**
- Full-screen overlay
- Larger touch targets (min 44x44px)
- Native date/time pickers where available

---

## Implementation Phases

### Phase 0: Pre-Implementation (1-2 days)

**Tasks:**
1. Set up Google Cloud Console project
   - Create OAuth 2.0 credentials
   - Configure authorized redirect URIs
   - Enable Google Calendar API
   - Note client ID and secret

2. Set up Microsoft Azure App Registration
   - Create app registration
   - Configure redirect URIs
   - Add Calendars.ReadWrite API permission
   - Grant admin consent (if required)
   - Note client ID and secret

3. Configure Supabase
   - Add secrets to Supabase (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, etc.)
   - Set up Supabase Vault for token encryption
   - Generate encryption key

4. Environment Variables
   - Add to `.env.local`:
     ```
     VITE_GOOGLE_CLIENT_ID=xxx
     VITE_MICROSOFT_CLIENT_ID=xxx
     ```
   - Add to Supabase Edge Functions secrets:
     ```
     GOOGLE_CLIENT_SECRET=xxx
     MICROSOFT_CLIENT_SECRET=xxx
     CALENDAR_ENCRYPTION_KEY=xxx
     ```

**Deliverables:**
- OAuth credentials documented
- Redirect URIs configured (dev + prod)
- Secrets stored securely

---

### Phase 1: Database & Security Foundation (2-3 days)

**Tasks:**

1. Create database migration
   - File: `supabase/migrations/YYYYMMDD_calendar_integration.sql`
   - Tables: `user_calendar_connections`, `calendar_events`
   - RLS policies
   - Indexes
   - Triggers

2. Test database schema
   - Verify RLS policies (user A cannot read user B's rows)
   - Verify cascading deletes work
   - Test encrypted token storage (manual insert)

3. Create token encryption utilities
   - File: `src/lib/calendarEncryption.js`
   - Functions: `encryptToken()`, `decryptToken()`
   - Use Web Crypto API or Supabase Vault

4. Write security tests
   - Implement all 10 "Break-it" tests
   - Document edge cases
   - Create test user accounts for Google/Microsoft

**Deliverables:**
- Migration file applied to dev database
- RLS policies tested and verified
- Encryption utilities tested
- Security test suite passing

**Files Created:**
- `supabase/migrations/YYYYMMDD_calendar_integration.sql`
- `src/lib/calendarEncryption.js` (if client-side encryption needed)
- `tests/security/calendar-auth.test.js`

---

### Phase 2: OAuth Implementation (3-4 days)

**Tasks:**

1. Create Supabase Edge Functions
   - `supabase/functions/google-oauth-callback/index.ts`
   - `supabase/functions/microsoft-oauth-callback/index.ts`
   - `supabase/functions/refresh-calendar-token/index.ts`
   - `supabase/functions/disconnect-calendar/index.ts`

2. Implement Google OAuth flow
   - Authorization URL generation
   - Callback handling (code → tokens)
   - Token encryption and storage
   - Primary calendar detection
   - Error handling

3. Implement Microsoft OAuth flow
   - Similar to Google
   - Microsoft Graph API specifics
   - Tenant handling (common endpoint)

4. Implement token refresh logic
   - Check expiry before API calls
   - Automatic refresh if < 5 min remaining
   - Update database with new token
   - Retry logic (3 attempts)

5. Implement disconnect flow
   - Revoke tokens with provider (optional)
   - Delete from database
   - Client-side state update

**Deliverables:**
- 4 Edge Functions deployed
- OAuth flows tested with real accounts
- Token refresh tested (manual expiry)
- Error handling verified

**Files Created:**
- `supabase/functions/google-oauth-callback/index.ts`
- `supabase/functions/microsoft-oauth-callback/index.ts`
- `supabase/functions/refresh-calendar-token/index.ts`
- `supabase/functions/disconnect-calendar/index.ts`
- `src/utils/calendarOAuth.js` (client-side helpers)

---

### Phase 3: Settings UI (2-3 days)

**Tasks:**

1. Create custom hook
   - File: `src/hooks/useCalendarConnection.js`
   - Functions: `connectGoogle()`, `connectMicrosoft()`, `disconnect()`, `getConnections()`
   - State management for connection status
   - Loading states

2. Update SettingsModal
   - Add Calendar Connection section (collapsible)
   - Show connection status
   - Connect buttons (Google + Microsoft)
   - Disconnect buttons with confirmation
   - Loading states during OAuth
   - Success/error messages

3. Handle OAuth callback redirect
   - Parse URL params on Settings page load
   - Show success message if `?calendar=connected`
   - Update connection state

4. Mobile responsive design
   - Test on mobile viewport
   - Adjust button sizes, spacing
   - Ensure OAuth flow works on mobile browsers

**Deliverables:**
- Settings UI complete
- OAuth connection tested end-to-end
- Disconnect tested
- Mobile responsive

**Files Modified:**
- `src/components/modals/SettingsModal.jsx`

**Files Created:**
- `src/hooks/useCalendarConnection.js`

---

### Phase 4: Calendar Event Creation (3-4 days)

**Tasks:**

1. Create Edge Function for event creation
   - File: `supabase/functions/create-calendar-event/index.ts`
   - Input: userId, provider, resourceId, eventDetails (date, time, duration, notes)
   - Get connection from database
   - Check token expiry, refresh if needed
   - Create event via Google/Microsoft API
   - Insert into `calendar_events` table (optional tracking)
   - Return event ID and calendar link

2. Create CalendarEventModal component
   - File: `src/components/modals/CalendarEventModal.jsx`
   - Date picker (react-datepicker)
   - Time picker
   - Duration dropdown
   - Calendar selector (if multiple)
   - Notes textarea
   - Validation logic
   - API call to create-calendar-event
   - Success/error states

3. Update ResourceCard component
   - Add "Add to Calendar" button
   - Show only if calendar connected
   - Dropdown if multiple calendars
   - Open CalendarEventModal on click
   - Pass resource details to modal

4. Event creation logic
   - Format event data:
     - Title: "[Resource Title] - Surgical Technique Review"
     - Description: Resource description + links
     - Start: User-selected date/time
     - End: Start + duration
     - Reminders: [1 day, 1 hour]
   - Google Calendar API call
   - Microsoft Graph API call
   - Handle timezone (use user's profile timezone or browser timezone)

5. Error handling
   - Token expired → refresh and retry
   - API quota exceeded → show user-friendly message
   - Network error → retry logic
   - Invalid date/time → validation error

**Deliverables:**
- CalendarEventModal complete
- Add to Calendar button on ResourceCard
- Event creation tested with both Google and Microsoft
- Error scenarios handled

**Files Created:**
- `supabase/functions/create-calendar-event/index.ts`
- `src/components/modals/CalendarEventModal.jsx`
- `src/hooks/useCalendarEvent.js`

**Files Modified:**
- `src/components/resources/Resourcecard.jsx`
- `src/components/modals/index.js` (export CalendarEventModal)

---

### Phase 5: Testing & Polish (2-3 days)

**Tasks:**

1. End-to-end testing
   - Connect Google Calendar
   - Add resource to calendar
   - Verify event appears in Google Calendar
   - Disconnect Google Calendar
   - Repeat with Microsoft
   - Test both calendars connected simultaneously

2. Error scenario testing
   - Expire token manually → verify auto-refresh
   - Revoke access in Google/Microsoft → verify re-auth flow
   - Disconnect during event creation → verify graceful handling
   - Network interruption → verify retry logic
   - Calendar API down → verify error message

3. Edge case testing
   - Past date selection → validation error
   - Timezone edge cases (user in different timezone than calendar)
   - Duplicate event creation (click button twice rapidly)
   - Empty notes field
   - Special characters in notes
   - Very long resource titles (test truncation)

4. UI polish
   - Loading animations smooth
   - Success messages clear
   - Error messages actionable
   - Button states (disabled during loading)
   - Mobile touch targets adequate (44x44px minimum)

5. Performance testing
   - Event creation completes < 3 seconds
   - Token refresh doesn't block UI
   - Settings page loads quickly with connections

6. Accessibility
   - Keyboard navigation works
   - Screen reader friendly labels
   - Focus management in modals
   - Color contrast meets WCAG AA

**Deliverables:**
- All test scenarios passing
- UI polished and responsive
- Performance benchmarks met
- Accessibility verified

---

### Phase 6: Documentation & Deployment (1-2 days)

**Tasks:**

1. Update user-facing documentation
   - Add "Calendar Integration" section to help docs
   - Screenshots of connection flow
   - FAQ: "How do I connect my calendar?"
   - Troubleshooting guide

2. Update technical documentation
   - Add calendar integration to `TECH_STACK.md`
   - Document Edge Functions in repo
   - Add OAuth credentials setup to README

3. Environment setup for production
   - Add production redirect URIs to Google/Microsoft
   - Verify secrets in Supabase production project
   - Test OAuth flow on staging/production URL

4. Deploy to production
   - Merge to main branch
   - Verify Cloudflare deployment
   - Test OAuth callback on production URL
   - Monitor Supabase Edge Function logs

5. Monitoring & analytics
   - Track calendar connection events
   - Track event creation success/failure rates
   - Set up alerts for high error rates

**Deliverables:**
- Documentation complete
- Production deployment successful
- Monitoring in place

**Files Created/Modified:**
- `docs/CALENDAR_INTEGRATION_USER_GUIDE.md`
- `README.md` (add calendar setup instructions)
- `TECH_STACK.md` (add calendar APIs)

---

## Testing Strategy

### Unit Tests

**Token Encryption:**
```javascript
// src/lib/calendarEncryption.test.js
test('encryptToken creates non-plaintext output', () => {
  const plaintext = 'my-access-token';
  const encrypted = encryptToken(plaintext);
  expect(encrypted).not.toEqual(plaintext);
  expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64
});

test('decryptToken reverses encryption', () => {
  const plaintext = 'my-access-token';
  const encrypted = encryptToken(plaintext);
  const decrypted = decryptToken(encrypted);
  expect(decrypted).toEqual(plaintext);
});

test('decryptToken fails on invalid input', () => {
  expect(() => decryptToken('invalid')).toThrow();
});
```

**useCalendarConnection Hook:**
```javascript
// src/hooks/useCalendarConnection.test.js
test('connectGoogle initiates OAuth flow', async () => {
  const { result } = renderHook(() => useCalendarConnection());

  const windowSpy = jest.spyOn(window, 'location', 'get');
  await act(() => result.current.connectGoogle());

  expect(windowSpy).toHaveBeenCalled();
  expect(window.location.href).toContain('accounts.google.com');
});

test('getConnections returns user calendar connections', async () => {
  const { result } = renderHook(() => useCalendarConnection());

  await waitFor(() => {
    expect(result.current.connections).toHaveLength(1);
    expect(result.current.connections[0].provider).toBe('google');
  });
});
```

### Integration Tests

**OAuth Callback Flow:**
```javascript
// tests/integration/calendar-oauth.test.js
test('Google OAuth callback stores encrypted tokens', async () => {
  // 1. Simulate OAuth callback with mock code
  const response = await fetch('/functions/v1/google-oauth-callback?code=mock_code&state=valid_state');

  // 2. Verify redirect to app
  expect(response.status).toBe(302);
  expect(response.headers.get('Location')).toContain('/settings?calendar=connected');

  // 3. Verify database entry
  const { data } = await supabase
    .from('user_calendar_connections')
    .select('*')
    .eq('provider', 'google')
    .single();

  expect(data.access_token_encrypted).toBeDefined();
  expect(data.access_token_encrypted).not.toContain('mock_code');
});
```

**Event Creation Flow:**
```javascript
test('Creating calendar event succeeds', async () => {
  // 1. Connect calendar (mock)
  await connectMockCalendar('google');

  // 2. Create event
  const eventData = {
    resourceId: 'resource-123',
    date: '2026-02-15',
    time: '14:00',
    duration: 30,
    notes: 'Review before Smith case'
  };

  const response = await createCalendarEvent('google', eventData);

  expect(response.success).toBe(true);
  expect(response.eventId).toBeDefined();
  expect(response.calendarLink).toContain('calendar.google.com');
});
```

### End-to-End Tests

**Full User Journey (Playwright/Cypress):**
```javascript
// e2e/calendar-integration.spec.js
test('User can connect calendar and add resource', async ({ page }) => {
  // 1. Login
  await page.goto('/');
  await page.click('[data-testid="login-button"]');
  // ... login flow

  // 2. Open Settings
  await page.click('[data-testid="settings-button"]');

  // 3. Expand Calendar section
  await page.click('text=Connect Calendar');

  // 4. Connect Google (will require test account credentials)
  await page.click('text=Connect Google Calendar');
  // ... OAuth flow (may need to mock)

  // 5. Verify connection success
  await expect(page.locator('text=Google Calendar')).toContainText('Connected');

  // 6. Close Settings
  await page.click('[data-testid="close-settings"]');

  // 7. Find a resource
  await page.goto('/');
  // ... navigate to resource

  // 8. Click Add to Calendar
  await page.click('[data-testid="add-to-calendar-button"]');

  // 9. Fill event details
  await page.fill('[data-testid="event-date"]', '2026-02-15');
  await page.fill('[data-testid="event-time"]', '14:00');
  await page.click('text=Add to Calendar');

  // 10. Verify success
  await expect(page.locator('text=Added to Google Calendar')).toBeVisible();
});
```

---

## Error Handling

### Client-Side Errors

**Error States:**

1. **OAuth Initiation Failed**
   - Cause: Invalid client ID, network error
   - Message: "Unable to connect to [Provider]. Please try again."
   - Action: Retry button

2. **OAuth Callback Failed**
   - Cause: State mismatch, code exchange failed, user denied
   - Message: "Calendar connection failed. [Reason]"
   - Action: Return to Settings, try again

3. **Token Refresh Failed**
   - Cause: Refresh token expired/revoked
   - Message: "Your [Provider] calendar connection expired. Please reconnect."
   - Action: Show "Reconnect" button in Settings

4. **Event Creation Failed**
   - Cause: API error, network error, invalid data
   - Message: "Failed to add to calendar. [Reason]"
   - Action: "Try Again" button, suggestion to check calendar connection

5. **No Calendar Connected**
   - Cause: User clicks "Add to Calendar" but not connected
   - Message: Tooltip or toast: "Connect your calendar in Settings first"
   - Action: Link to Settings

### Server-Side Errors (Edge Functions)

**Error Responses:**

```javascript
// Standard error response format
{
  success: false,
  error: {
    code: 'TOKEN_EXPIRED', // Machine-readable
    message: 'Your calendar access has expired. Please reconnect.', // User-friendly
    details: {...} // Optional, for debugging (not shown to user)
  }
}
```

**Error Codes:**

- `TOKEN_EXPIRED` - Access token expired, refresh failed
- `TOKEN_REVOKED` - User revoked access in Google/Microsoft
- `INVALID_STATE` - OAuth state parameter mismatch (CSRF)
- `API_QUOTA_EXCEEDED` - Calendar API quota exhausted
- `API_ERROR` - Generic calendar API error
- `NETWORK_ERROR` - Network timeout or unavailable
- `INVALID_INPUT` - Validation error (bad date, etc.)
- `DATABASE_ERROR` - Supabase query failed
- `ENCRYPTION_ERROR` - Token encryption/decryption failed

### Retry Logic

**Automatic Retries (Server-Side):**
```javascript
async function createEventWithRetry(provider, eventData, maxRetries = 3) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await createEvent(provider, eventData);
    } catch (error) {
      attempt++;

      // Retry on transient errors
      if (error.code === 'NETWORK_ERROR' && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await sleep(delay);
        continue;
      }

      // Don't retry on permanent errors
      if (error.code === 'TOKEN_REVOKED' || error.code === 'INVALID_INPUT') {
        throw error;
      }

      // Last attempt failed
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
}
```

**User-Initiated Retries (Client-Side):**
- Show "Try Again" button on errors
- Clear error state on retry
- Show loading state during retry

### Logging & Monitoring

**Log Levels:**
- `INFO` - Successful operations (connection, event creation)
- `WARN` - Recoverable errors (token refresh, retry)
- `ERROR` - Failed operations (user action needed)

**Log Format:**
```javascript
{
  timestamp: '2026-02-07T12:34:56Z',
  level: 'ERROR',
  function: 'create-calendar-event',
  userId: 'user-123', // Masked in production
  provider: 'google',
  error: {
    code: 'API_ERROR',
    message: 'Calendar API returned 503',
    stack: '...' // Only in dev
  }
}
```

**Monitoring Alerts:**
- Error rate > 5% for calendar operations → Slack/email alert
- Token refresh failures > 10 per hour → Investigate provider issues
- Edge Function timeouts > 10 seconds → Performance issue

---

## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Multiple Calendar Selection**
   - User can choose specific calendar (not just primary)
   - Support shared calendars (e.g., hospital OR schedule)

2. **Event Management**
   - View all events created from app
   - Edit event date/time from app
   - Delete event from app
   - Sync changes bidirectionally

3. **Recurring Events**
   - "Add to calendar weekly" for technique reviews
   - Recurring prep sessions before complex cases

4. **Calendar Sync**
   - Import upcoming cases from calendar → Upcoming Cases list
   - Detect conflicts with existing events
   - Suggest optimal review times based on case schedule

5. **Apple Calendar Support**
   - CalDAV integration for iCloud calendars
   - Native iOS calendar picker

6. **Outlook Desktop/Mobile Support**
   - Deep linking to Outlook app
   - Better mobile experience on iOS/Android

7. **Team Calendars**
   - Residents/fellows can share technique review schedules
   - Attending can assign resources to resident calendars

8. **Smart Scheduling**
   - AI suggests optimal review times based on case schedule
   - "Review 2 days before case" automation
   - Spaced repetition for technique reinforcement

9. **Notifications**
   - App sends reminder in addition to calendar reminder
   - "You have 3 techniques to review this week"

10. **Analytics**
    - Track most-calendared resources
    - Show users their review history
    - Insights: "You review ACL techniques 2x/month"

### Technical Debt to Address

1. **Token Rotation**
   - Implement encryption key rotation without breaking existing connections
   - Migration strategy for re-encrypting tokens

2. **Rate Limiting**
   - More sophisticated rate limiting (per user, per provider)
   - Graceful degradation when approaching limits

3. **Caching**
   - Cache calendar metadata (primary calendar ID, email)
   - Reduce API calls for connection status checks

4. **Webhook Support**
   - Google Calendar push notifications
   - Detect when user disconnects via Google/Microsoft settings

5. **Offline Support**
   - Queue event creation when offline
   - Sync when connection restored

---

## Success Metrics

### Adoption Metrics

- **Connection Rate:** % of active users who connect at least one calendar
  - Target: 40% within 3 months

- **Usage Rate:** % of connected users who create at least one event
  - Target: 60% within first week of connecting

- **Multi-Calendar Rate:** % of users who connect both Google and Microsoft
  - Target: 15%

### Engagement Metrics

- **Events Created:** Total calendar events created
  - Target: 100+ per week (growing)

- **Avg Events per User:** Events created per connected user per month
  - Target: 5+ events/month

- **Retention:** % of users still connected after 30 days
  - Target: 80%

### Technical Metrics

- **Event Creation Success Rate:** % of event creation attempts that succeed
  - Target: 95%+

- **Token Refresh Success Rate:** % of token refreshes that succeed
  - Target: 99%+

- **API Latency:** Time from "Add to Calendar" click to success message
  - Target: < 3 seconds (p95)

- **Error Rate:** % of calendar operations that fail
  - Target: < 5%

### User Satisfaction

- **Feature Rating:** User rating of calendar integration (1-5 stars)
  - Target: 4.5+ average

- **Support Tickets:** Calendar-related support tickets per 100 users
  - Target: < 2 tickets/100 users/month

---

## Appendix

### A. OAuth Credentials Setup

**Google Cloud Console:**
1. Go to https://console.cloud.google.com/
2. Create new project: "Surgical Techniques App"
3. Enable Google Calendar API
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URIs:
   - http://localhost:5176/auth/google/callback (dev)
   - https://[supabase-project].supabase.co/functions/v1/google-oauth-callback
6. Note Client ID and Client Secret

**Microsoft Azure Portal:**
1. Go to https://portal.azure.com/
2. Azure Active Directory → App registrations → New registration
3. Name: "Surgical Techniques App"
4. Supported account types: Multitenant
5. Add redirect URIs:
   - http://localhost:5176/auth/microsoft/callback (dev)
   - https://[supabase-project].supabase.co/functions/v1/microsoft-oauth-callback
6. API permissions → Add Calendars.ReadWrite (delegated)
7. Certificates & secrets → New client secret
8. Note Application (client) ID and Client secret

### B. API Reference

**Google Calendar API:**
- Docs: https://developers.google.com/calendar/api/v3/reference
- Events.insert: https://developers.google.com/calendar/api/v3/reference/events/insert

**Microsoft Graph API:**
- Docs: https://learn.microsoft.com/en-us/graph/api/overview
- Create event: https://learn.microsoft.com/en-us/graph/api/user-post-events

### C. Timezone Handling

**Strategy:**
- Use IANA timezone names (e.g., "America/New_York")
- Get user timezone from browser: `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Store in user profile (optional)
- Pass timezone to calendar APIs

**Libraries:**
- `date-fns-tz` for timezone conversion
- `luxon` as alternative (more robust)

### D. Security Checklist

Before Production:
- [ ] OAuth secrets stored in Supabase secrets (not env files)
- [ ] Redirect URIs configured for production domain
- [ ] RLS policies tested and verified
- [ ] Tokens encrypted with strong algorithm (AES-256-GCM)
- [ ] State parameter validated on OAuth callback
- [ ] HTTPS enforced for all OAuth flows
- [ ] Rate limiting enabled on Edge Functions
- [ ] Error messages sanitized (no token/secret exposure)
- [ ] User input sanitized before calendar API calls
- [ ] Token expiry checked before all API calls
- [ ] Refresh token rotation implemented
- [ ] Disconnect revokes tokens with provider

---

**End of Document**
