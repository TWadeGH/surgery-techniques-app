-- =====================================================
-- Calendar Token Encryption with Supabase Vault
-- =====================================================
-- This migration adds encryption for OAuth tokens using Supabase Vault
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable Supabase Vault extension
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Add vault ID columns to store encrypted tokens
ALTER TABLE user_calendar_connections
  ADD COLUMN IF NOT EXISTS access_token_vault_id UUID,
  ADD COLUMN IF NOT EXISTS refresh_token_vault_id UUID;

-- Create helper function to encrypt and store token
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
  -- Insert secret into vault
  INSERT INTO vault.secrets (secret, name)
  VALUES (p_secret, p_name)
  RETURNING id INTO v_vault_id;

  RETURN v_vault_id;
END;
$$;

-- Create helper function to read encrypted token
CREATE OR REPLACE FUNCTION read_encrypted_token(
  p_vault_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  -- Read decrypted secret from vault
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = p_vault_id;

  RETURN v_secret;
END;
$$;

-- Create helper function to delete encrypted token
CREATE OR REPLACE FUNCTION delete_encrypted_token(
  p_vault_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete secret from vault
  DELETE FROM vault.secrets
  WHERE id = p_vault_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION store_encrypted_token TO authenticated;
GRANT EXECUTE ON FUNCTION read_encrypted_token TO authenticated;
GRANT EXECUTE ON FUNCTION delete_encrypted_token TO authenticated;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION store_encrypted_token TO service_role;
GRANT EXECUTE ON FUNCTION read_encrypted_token TO service_role;
GRANT EXECUTE ON FUNCTION delete_encrypted_token TO service_role;

-- Create trigger to delete vault secrets when connection is deleted
CREATE OR REPLACE FUNCTION cleanup_calendar_vault_secrets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete access token from vault
  IF OLD.access_token_vault_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = OLD.access_token_vault_id;
  END IF;

  -- Delete refresh token from vault
  IF OLD.refresh_token_vault_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = OLD.refresh_token_vault_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS cleanup_calendar_vault_secrets_trigger ON user_calendar_connections;

CREATE TRIGGER cleanup_calendar_vault_secrets_trigger
  BEFORE DELETE ON user_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_calendar_vault_secrets();

-- =====================================================
-- Migration: Move existing plaintext tokens to vault
-- =====================================================
-- WARNING: This will encrypt all existing tokens
-- Only run this ONCE after deploying updated Edge Functions
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_access_vault_id UUID;
  v_refresh_vault_id UUID;
BEGIN
  -- Loop through all connections with plaintext tokens
  FOR r IN
    SELECT id, user_id, provider, access_token_encrypted, refresh_token_encrypted
    FROM user_calendar_connections
    WHERE access_token_vault_id IS NULL
      AND access_token_encrypted IS NOT NULL
  LOOP
    -- Encrypt access token
    v_access_vault_id := store_encrypted_token(
      r.access_token_encrypted,
      format('calendar_access_%s_%s', r.user_id, r.provider)
    );

    -- Encrypt refresh token if exists
    IF r.refresh_token_encrypted IS NOT NULL THEN
      v_refresh_vault_id := store_encrypted_token(
        r.refresh_token_encrypted,
        format('calendar_refresh_%s_%s', r.user_id, r.provider)
      );
    END IF;

    -- Update connection with vault IDs and clear plaintext tokens
    UPDATE user_calendar_connections
    SET
      access_token_vault_id = v_access_vault_id,
      refresh_token_vault_id = v_refresh_vault_id,
      access_token_encrypted = NULL,
      refresh_token_encrypted = NULL
    WHERE id = r.id;

    RAISE NOTICE 'Encrypted tokens for user % provider %', r.user_id, r.provider;
  END LOOP;

  RAISE NOTICE 'Token encryption migration complete!';
END $$;

-- =====================================================
-- Optional: Drop old plaintext columns after migration
-- =====================================================
-- ONLY run this after verifying everything works with vault
-- This is irreversible!
-- =====================================================

-- ALTER TABLE user_calendar_connections
--   DROP COLUMN IF EXISTS access_token_encrypted,
--   DROP COLUMN IF EXISTS refresh_token_encrypted;

-- =====================================================
-- Verification Query
-- =====================================================
-- Check that all connections have vault IDs

SELECT
  id,
  user_id,
  provider,
  access_token_vault_id IS NOT NULL as has_access_token,
  refresh_token_vault_id IS NOT NULL as has_refresh_token,
  access_token_encrypted IS NULL as access_token_cleared,
  refresh_token_encrypted IS NULL as refresh_token_cleared
FROM user_calendar_connections;

-- =====================================================
-- Expected Result:
-- All rows should show:
-- - has_access_token: true
-- - has_refresh_token: true (if they had one)
-- - access_token_cleared: true
-- - refresh_token_cleared: true
-- =====================================================
