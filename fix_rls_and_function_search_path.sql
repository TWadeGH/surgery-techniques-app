-- ============================================================================
-- SECURITY MIGRATION: RLS + Function Search Path
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Date: 2026-02-11
-- ============================================================================
-- Fixes two classes of issues flagged by Supabase Security Advisor:
--   1. CRITICAL: RLS not enabled on resource_history and analytics_insights
--   2. WARNING:  SECURITY DEFINER functions with mutable search_path
-- ============================================================================

-- ============================================================================
-- PART 1: ENABLE RLS ON UNPROTECTED TABLES
-- ============================================================================

-- resource_history
-- Has an existing SELECT policy ("Admins can view resource history") but RLS
-- was never enabled on the table itself, making that policy non-operative.
ALTER TABLE resource_history ENABLE ROW LEVEL SECURITY;

-- Add DELETE policy (App.jsx deletes from this table when a resource is removed)
DROP POLICY IF EXISTS "Admins can delete resource history" ON resource_history;
CREATE POLICY "Admins can delete resource history"
  ON resource_history
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Add INSERT policy (database trigger inserts rows when resources change;
-- trigger fires under authenticated user context, so needs an INSERT policy)
DROP POLICY IF EXISTS "Admins can insert resource history" ON resource_history;
CREATE POLICY "Admins can insert resource history"
  ON resource_history
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- analytics_insights
-- Stores aggregated, de-identified analytics rows. Only super_admin reads it
-- via getAggregatedInsights() in analytics.js. Writes are done by DB functions.
ALTER TABLE analytics_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view analytics insights" ON analytics_insights;
CREATE POLICY "Super admins can view analytics insights"
  ON analytics_insights
  FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Writes to analytics_insights come from server-side DB functions (SECURITY DEFINER),
-- not directly from the client, so no INSERT/UPDATE/DELETE client policy is needed.


-- ============================================================================
-- PART 2: FIX MUTABLE SEARCH PATH ON SECURITY DEFINER FUNCTIONS
-- ============================================================================
-- Without a fixed search_path, a malicious user who can create schemas/objects
-- could hijack function behavior via search_path manipulation.
-- SET search_path = '' forces fully-qualified table references, eliminating risk.

-- Functions defined in comprehensive_rls_policies.sql
ALTER FUNCTION is_super_admin(UUID)                         SET search_path = '';
ALTER FUNCTION is_specialty_admin(UUID)                     SET search_path = '';
ALTER FUNCTION is_subspecialty_admin(UUID)                  SET search_path = '';
ALTER FUNCTION is_admin(UUID)                               SET search_path = '';
ALTER FUNCTION get_user_specialty_id(UUID)                  SET search_path = '';
ALTER FUNCTION get_user_subspecialty_id(UUID)               SET search_path = '';

-- Functions that exist only in the live DB (created outside local SQL files).
-- Use dynamic SQL so we don't need to guess exact parameter types.
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.proname, p.oid,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'is_admin_for_subspecialty',
        'is_specialty_admin_for',
        'auto_create_subspecialty_company',
        'close_inactive_sessions'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = ''''',
      func_record.proname,
      func_record.args
    );
  END LOOP;
END;
$$;
