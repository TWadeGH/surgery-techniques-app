# Calendar Token Encryption - Implementation Issues & Status

**Date:** February 9, 2026
**Status:** ⚠️ INCOMPLETE - Vault encryption blocked by permissions
**Current State:** Tokens stored in plaintext, protected only by RLS

---

## Executive Summary

Attempted to implement Supabase Vault encryption for OAuth tokens. Hit insurmountable permission errors with Supabase's managed vault. Vault infrastructure is in place but non-functional due to pgsodium crypto function access restrictions. **Recommendation: Implement application-level encryption instead.**

---

## Why Token Encryption Matters

OAuth access tokens stored in `user_calendar_connections` table grant full read/write access to users' Google Calendars. If the database is compromised or accessed by unauthorized parties:

- **Risk:** Attacker can read, create, delete events in user calendars
- **Impact:** Privacy violation, data manipulation, user trust loss
- **Mitigation Required:** Tokens must be encrypted at rest

Row Level Security (RLS) prevents unauthorized access within the application, but doesn't protect against:
- Database backups being compromised
- Admin account compromise
- Supabase infrastructure breach
- Accidental logging of tokens

---

## Attempted Solution: Supabase Vault

### What is Supabase Vault?

Supabase Vault is a built-in encryption layer using the `pgsodium` extension:
- Encrypts data at rest using deterministic encryption
- Stores encrypted data in `vault.secrets` table
- Returns UUIDs that reference encrypted secrets
- Provides `vault.decrypted_secrets` view for authorized reads

**Why we chose it:** Native Supabase feature, designed for this exact use case, uses PostgreSQL-level encryption.

---

## What We Implemented (Database Layer)

### 1. Vault Extension Setup

**File:** `calendar_vault_encryption.sql`

```sql
-- Enable Supabase Vault extension
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
```

✅ **Status:** Successfully enabled

---

### 2. Schema Changes

Added vault ID columns to `user_calendar_connections`:

```sql
ALTER TABLE public.user_calendar_connections
  ADD COLUMN IF NOT EXISTS access_token_vault_id UUID,
  ADD COLUMN IF NOT EXISTS refresh_token_vault_id UUID;
```

**Purpose:** Store references to encrypted tokens in vault instead of plaintext tokens.

✅ **Status:** Columns added successfully

---

### 3. Helper Functions Created

#### `store_encrypted_token(p_secret TEXT, p_name TEXT) RETURNS UUID`

**Purpose:** Encrypt a token and store it in vault.secrets, return vault ID

```sql
CREATE OR REPLACE FUNCTION store_encrypted_token(
  p_secret TEXT,
  p_name TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vault_id UUID;
BEGIN
  INSERT INTO vault.secrets (secret, name)
  VALUES (p_secret, p_name)
  RETURNING id INTO v_vault_id;

  RETURN v_vault_id;
END;
$$;
```

✅ **Status:** Function created
❌ **Functional:** NO - hits permission errors when called

---

#### `read_encrypted_token(p_vault_id UUID) RETURNS TEXT`

**Purpose:** Decrypt a token from vault using its ID

```sql
CREATE OR REPLACE FUNCTION read_encrypted_token(
  p_vault_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = p_vault_id;

  RETURN v_secret;
END;
$$;
```

✅ **Status:** Function created
❓ **Functional:** Unknown - never tested due to store failure

---

#### `delete_encrypted_token(p_vault_id UUID) RETURNS VOID`

**Purpose:** Delete encrypted token from vault

```sql
CREATE OR REPLACE FUNCTION delete_encrypted_token(
  p_vault_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = p_vault_id;
END;
$$;
```

✅ **Status:** Function created
❓ **Functional:** Unknown - never tested

---

### 4. Permissions Granted

```sql
-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION store_encrypted_token TO authenticated;
GRANT EXECUTE ON FUNCTION read_encrypted_token TO authenticated;
GRANT EXECUTE ON FUNCTION delete_encrypted_token TO authenticated;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION store_encrypted_token TO service_role;
GRANT EXECUTE ON FUNCTION read_encrypted_token TO service_role;
GRANT EXECUTE ON FUNCTION delete_encrypted_token TO service_role;

-- Grant permissions on vault schema
GRANT USAGE ON SCHEMA vault TO postgres, service_role, authenticated;
GRANT ALL ON vault.secrets TO postgres, service_role;
GRANT SELECT ON vault.decrypted_secrets TO postgres, service_role, authenticated;

-- Change function ownership
ALTER FUNCTION store_encrypted_token(text, text) OWNER TO postgres;
ALTER FUNCTION read_encrypted_token(uuid) OWNER TO postgres;
ALTER FUNCTION delete_encrypted_token(uuid) OWNER TO postgres;
```

✅ **Status:** Permissions granted
❌ **Effective:** NO - still hit permission errors

---

### 5. Cleanup Trigger

**Purpose:** Automatically delete vault secrets when calendar connection is deleted

```sql
CREATE OR REPLACE FUNCTION cleanup_calendar_vault_secrets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.access_token_vault_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = OLD.access_token_vault_id;
  END IF;

  IF OLD.refresh_token_vault_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = OLD.refresh_token_vault_id;
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER cleanup_calendar_vault_secrets_trigger
  BEFORE DELETE ON public.user_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_calendar_vault_secrets();
```

✅ **Status:** Trigger created
❓ **Functional:** Unknown - depends on delete_encrypted_token working

---

## Edge Functions Updated (Code Layer)

### Updated Functions

All 4 Edge Functions were updated to use vault encryption:

1. ✅ `google-oauth-callback/index.ts` - Calls `store_encrypted_token` RPC
2. ✅ `create-calendar-event/index.ts` - Calls `read_encrypted_token` RPC
3. ✅ `delete-calendar-event/index.ts` - Calls `read_encrypted_token` RPC
4. ✅ `disconnect-calendar/index.ts` - Calls `read_encrypted_token` RPC

**Example (google-oauth-callback):**

```typescript
// Encrypt access token
const { data: accessVaultData, error: accessVaultError } = await supabase
  .rpc('store_encrypted_token', {
    p_secret: access_token,
    p_name: `calendar_access_${userId}_google`
  })

// Store vault ID instead of plaintext token
const { error: dbError } = await supabase
  .from('user_calendar_connections')
  .upsert({
    user_id: userId,
    provider: 'google',
    access_token_vault_id: accessVaultData,  // UUID reference
    refresh_token_vault_id: refreshVaultData,
    // ... other fields
  })
```

✅ **Status:** All Edge Functions deployed with vault code
❌ **Working:** NO - fails when called with encryption_failed error

---

## Permission Errors Encountered

### Error 1: Vault Internal Crypto Functions

**Error Message:**
```
ERROR: 42501: permission denied for function _crypto_aead_det_noncegen
```

**Where:** When `store_encrypted_token` tries to INSERT into `vault.secrets`

**Root Cause:** The pgsodium extension's internal crypto functions (`_crypto_aead_det_noncegen`, `crypto_sign_final_verify`, etc.) are not accessible to our custom functions, even with `SECURITY DEFINER` and `OWNER TO postgres`.

**What We Tried:**
1. ✅ Granted USAGE on vault schema
2. ✅ Granted ALL on vault.secrets table
3. ✅ Made functions SECURITY DEFINER
4. ✅ Changed function owner to postgres
5. ❌ Tried to enable pgsodium extension (schema didn't exist)
6. ❌ Tried to grant permissions on pgsodium functions (permission denied)
7. ❌ Tried to change owner to supabase_admin (not allowed: "must be able to SET ROLE supabase_admin")

---

### Error 2: Supabase Admin Role Restriction

**Error Message:**
```
ERROR: 42501: must be able to SET ROLE "supabase_admin"
```

**Where:** When attempting `ALTER FUNCTION ... OWNER TO supabase_admin`

**Root Cause:** In Supabase's managed environment:
- `vault.secrets` table is owned by `supabase_admin`
- `supabase_admin` role has special privileges to access pgsodium crypto functions
- Regular database users (including `postgres` role) cannot assume `supabase_admin` role
- Cannot transfer function ownership to `supabase_admin`

**Implication:** We cannot create custom functions that access vault's internal crypto layer in Supabase's managed environment.

---

### Error 3: PGSodium Schema Missing

**Error Message:**
```
ERROR: 3F000: schema "pgsodium" does not exist
```

**Where:** When trying to grant permissions on pgsodium schema

**Root Cause:** Supabase Vault uses pgsodium internally, but the pgsodium schema is not exposed to regular users. The crypto functions are internal to vault and managed by `supabase_admin`.

---

## Why Vault Approach Failed

### Architectural Issue

Supabase Vault is designed for **Supabase-managed encryption**, not user-defined encryption workflows. The vault.secrets table and crypto functions are:

1. **Owned by supabase_admin** - special role with superuser-like privileges
2. **Internal to Supabase** - crypto functions are not meant to be called by user-defined functions
3. **Permission-locked** - even SECURITY DEFINER functions owned by postgres can't access internal crypto

### What Supabase Vault IS For

- Encrypting columns using built-in Supabase features
- Supabase Dashboard encryption workflows
- Supabase Edge Functions with direct vault access (possibly)

### What Supabase Vault is NOT For

- User-defined RPC functions that encrypt/decrypt
- Custom encryption workflows
- Fine-grained control over encryption keys

---

## Current State of Database

### Tables

```sql
-- user_calendar_connections table has vault columns but they're unused
CREATE TABLE user_calendar_connections (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,

  -- OLD COLUMNS (still in use, NOT encrypted)
  access_token_encrypted TEXT NOT NULL,  -- ⚠️ PLAINTEXT
  refresh_token_encrypted TEXT,          -- ⚠️ PLAINTEXT
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- NEW COLUMNS (added but unused)
  access_token_vault_id UUID,            -- NULL for all rows
  refresh_token_vault_id UUID,           -- NULL for all rows

  -- ... other columns
);
```

**Current Risk:** Tokens are stored in `access_token_encrypted` and `refresh_token_encrypted` columns in **PLAINTEXT**, despite column names suggesting encryption.

---

### Functions

All vault helper functions exist but are **non-functional**:
- `store_encrypted_token` - ❌ Throws permission error
- `read_encrypted_token` - ❓ Untested
- `delete_encrypted_token` - ❓ Untested
- `cleanup_calendar_vault_secrets` - ❓ Untested

---

### Edge Functions

All 4 Edge Functions are deployed with vault encryption code, but fall back to errors:

**Current behavior when connecting calendar:**
1. User clicks "Connect Google Calendar"
2. OAuth flow completes successfully
3. `google-oauth-callback` Edge Function receives tokens
4. Tries to call `store_encrypted_token` RPC
5. RPC fails with permission error
6. Returns `encryption_failed` error to user
7. Calendar connection fails
8. No tokens stored (connection aborted)

**Result:** Calendar integration is completely broken in production.

---

## Attempted Permission Fixes (Chronological)

### Attempt 1: Grant vault schema permissions
```sql
GRANT USAGE ON SCHEMA vault TO postgres, service_role, authenticated;
GRANT ALL ON vault.secrets TO postgres, service_role;
```
**Result:** ❌ Still permission denied

---

### Attempt 2: Change function ownership to postgres
```sql
ALTER FUNCTION store_encrypted_token OWNER TO postgres;
```
**Result:** ❌ postgres doesn't have crypto function access

---

### Attempt 3: Enable pgsodium extension
```sql
CREATE EXTENSION IF NOT EXISTS pgsodium;
```
**Result:** ❌ Schema "pgsodium" does not exist

---

### Attempt 4: Grant pgsodium function permissions
```sql
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgsodium TO service_role;
```
**Result:** ❌ permission denied for function crypto_sign_final_verify

---

### Attempt 5: Change ownership to supabase_admin
```sql
ALTER FUNCTION store_encrypted_token OWNER TO supabase_admin;
```
**Result:** ❌ must be able to SET ROLE "supabase_admin" (not allowed)

---

## What Worked, What Didn't

### ✅ What Worked

1. Created vault extension
2. Added vault ID columns to table
3. Created helper functions (they exist, just don't work)
4. Granted basic permissions on vault schema/tables
5. Created cleanup trigger
6. Updated all Edge Functions with vault code
7. Deployed Edge Functions successfully

### ❌ What Didn't Work

1. Calling `store_encrypted_token` from Edge Functions
2. Granting pgsodium crypto function access
3. Changing function ownership to supabase_admin
4. Any actual encryption/decryption operations
5. Calendar OAuth flow (broken by encryption errors)

---

## Lessons Learned

1. **Supabase Vault is not designed for custom RPC functions** - It's meant for Supabase-managed encryption, not user-defined workflows

2. **Permission model is restrictive** - Cannot access internal pgsodium crypto functions from user-created functions

3. **supabase_admin role is off-limits** - Cannot assign ownership or execute as this role

4. **SECURITY DEFINER doesn't bypass internal restrictions** - Even with SECURITY DEFINER and postgres ownership, can't access vault internals

5. **Documentation gap** - Supabase Vault docs don't clearly explain these limitations for custom encryption workflows

---

## Recommended Next Steps

### Option A: Application-Level Encryption (RECOMMENDED)

**Approach:** Encrypt tokens in Edge Functions before storing in database

**How it works:**
1. Store encryption key as Supabase secret (e.g., `TOKEN_ENCRYPTION_KEY`)
2. In Edge Functions, encrypt tokens using Web Crypto API or libsodium
3. Store encrypted ciphertext in `access_token_encrypted` column (actually encrypted this time)
4. Decrypt when reading from database

**Advantages:**
- ✅ Full control over encryption
- ✅ No permission issues
- ✅ Works in Supabase's managed environment
- ✅ Standard industry practice
- ✅ Can use AES-256-GCM or ChaCha20-Poly1305

**Disadvantages:**
- ❌ Encryption happens in Edge Function (JavaScript), not database (PostgreSQL)
- ❌ Need to manage encryption key securely
- ❌ Slightly more code in Edge Functions

**Implementation effort:** 2-3 hours

---

### Option B: Accept Plaintext with RLS (NOT RECOMMENDED)

**Approach:** Keep tokens in plaintext, rely on Row Level Security

**Current protection:**
- RLS policies prevent users from seeing other users' tokens
- Only service_role can access tokens
- Tokens are not logged or exposed via APIs

**Risks:**
- ❌ Database backup compromised = tokens exposed
- ❌ Supabase admin access compromised = tokens exposed
- ❌ Accidental logging = tokens exposed
- ❌ Does not meet security best practices

**Recommendation:** DO NOT choose this option for production

---

### Option C: Contact Supabase Support

**Approach:** Ask Supabase if there's an official way to use Vault for custom encryption

**Questions to ask:**
1. How do we create custom RPC functions that encrypt/decrypt using vault?
2. Is there a way to grant pgsodium crypto function access to postgres role?
3. Is vault intended only for Supabase-managed encryption?
4. What's the recommended pattern for encrypting OAuth tokens?

**Timeline:** Unknown (support response time varies)

**Likelihood of solution:** Low (probably by design)

---

## Rollback Plan (If Needed)

To revert to working plaintext storage:

### 1. Revert Edge Functions

Remove vault encryption code from all 4 Edge Functions, go back to storing plaintext tokens in `access_token_encrypted` and `refresh_token_encrypted` columns.

**Affected files:**
- `supabase/functions/google-oauth-callback/index.ts`
- `supabase/functions/create-calendar-event/index.ts`
- `supabase/functions/delete-calendar-event/index.ts`
- `supabase/functions/disconnect-calendar/index.ts`

**Changes:**
- Remove `store_encrypted_token` RPC calls
- Remove `read_encrypted_token` RPC calls
- Store tokens directly in plaintext columns
- Read tokens directly from plaintext columns

### 2. Keep Vault Infrastructure

Leave vault columns, functions, and triggers in place for future use. They won't break anything if unused.

### 3. Optional: Drop Vault Columns

If we decide encryption is never happening:

```sql
ALTER TABLE user_calendar_connections
  DROP COLUMN IF EXISTS access_token_vault_id,
  DROP COLUMN IF EXISTS refresh_token_vault_id;
```

---

## Files Created/Modified

### Database Migrations (SQL)

1. **calendar_vault_encryption.sql** - Complete vault setup script
   - Location: `/Users/theresasandoval/surgical-techniques-app/calendar_vault_encryption.sql`
   - Status: Partially executed (vault enabled, functions created, permissions attempted)

### Edge Functions (TypeScript)

1. **google-oauth-callback/index.ts**
   - Location: `supabase/functions/google-oauth-callback/index.ts`
   - Changes: Added `store_encrypted_token` RPC calls
   - Status: Deployed but failing

2. **create-calendar-event/index.ts**
   - Location: `supabase/functions/create-calendar-event/index.ts`
   - Changes: Added `read_encrypted_token` RPC calls
   - Status: Deployed but untested (OAuth broken)

3. **delete-calendar-event/index.ts**
   - Location: `supabase/functions/delete-calendar-event/index.ts`
   - Changes: Added `read_encrypted_token` RPC calls
   - Status: Deployed but untested

4. **disconnect-calendar/index.ts**
   - Location: `supabase/functions/disconnect-calendar/index.ts`
   - Changes: Added `read_encrypted_token` RPC calls
   - Status: Deployed but untested

### Documentation

1. **CALENDAR_INTEGRATION.md** - Mentions vault encryption as completed (incorrect)
   - Location: `/Users/theresasandoval/surgical-techniques-app/CALENDAR_INTEGRATION.md`
   - Lines 164-167: States vault encryption is implemented (needs update)

2. **TOKEN_ENCRYPTION_IMPLEMENTATION.md** (this file)
   - Location: `/Users/theresasandoval/surgical-techniques-app/TOKEN_ENCRYPTION_IMPLEMENTATION.md`
   - Purpose: Technical deep-dive into vault failure

---

## Technical Debt Created

1. **Unused database columns:** `access_token_vault_id`, `refresh_token_vault_id`
2. **Non-functional RPC functions:** `store_encrypted_token`, `read_encrypted_token`, `delete_encrypted_token`
3. **Broken calendar integration:** OAuth flow fails in production
4. **Misleading column names:** `access_token_encrypted` contains plaintext
5. **Incomplete documentation:** CALENDAR_INTEGRATION.md claims vault works

---

## Security Implications (Current State)

### Critical Issues

1. **Tokens stored in plaintext** - Full calendar access if database compromised
2. **Misleading column names** - Team might assume tokens are encrypted when they're not
3. **Production OAuth broken** - Users cannot connect calendars (business impact)

### Mitigations in Place

1. **Row Level Security (RLS)** - Users can only see their own tokens
2. **Service role only access** - Client-side code cannot read tokens
3. **HTTPS in transit** - Tokens encrypted during transmission
4. **No client-side exposure** - Tokens only accessed in Edge Functions

### Risk Assessment

**Likelihood of compromise:** Low (requires database breach or admin access)
**Impact if compromised:** High (full calendar access for all users)
**Overall risk:** Medium
**Action required:** Implement proper encryption (Option A)

---

## Questions for Consideration

1. **Is application-level encryption acceptable for your security requirements?**
   - Most companies use this approach
   - Encryption key stored as Supabase secret
   - Tokens encrypted before storage, decrypted on read

2. **What is the risk tolerance for plaintext storage?**
   - Tokens already protected by RLS and service_role access
   - Risk is primarily database backup compromise
   - No compliance requirements mentioned (HIPAA, PCI, etc.)

3. **Is calendar integration critical for launch?**
   - Currently broken in production
   - Need to either fix vault or rollback to plaintext
   - Cannot ship with current state (OAuth fails)

4. **Should we wait for Supabase support response?**
   - Could take days/weeks
   - May not have a solution
   - Blocks calendar feature launch

---

## Recommendation

**Implement Option A: Application-Level Encryption**

**Reasoning:**
1. Vault approach is blocked by Supabase architecture
2. Application-level encryption is industry standard
3. Unblocks calendar integration immediately
4. Provides real encryption (unlike current plaintext)
5. Manageable implementation (2-3 hours)

**Next actions:**
1. Revert Edge Functions to plaintext (restore working OAuth)
2. Implement application-level encryption in Edge Functions
3. Test encryption/decryption flow
4. Update documentation with final approach
5. Deploy to production

---

## References

- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault)
- [pgsodium Extension](https://github.com/michelp/pgsodium)
- [Web Crypto API (Deno)](https://deno.land/api@v1.38.0?s=crypto)
- CALENDAR_INTEGRATION.md (this repo)
- calendar_vault_encryption.sql (this repo)

---

**Document Location:** `/Users/theresasandoval/surgical-techniques-app/TOKEN_ENCRYPTION_IMPLEMENTATION.md`
**Last Updated:** February 9, 2026
**Author:** Claude Sonnet 4.5 + Theresa Sandoval
