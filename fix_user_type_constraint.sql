-- Fix profiles_user_type_check constraint
-- Problem: onboarding saves user_type = 'trainee' or 'app' but the constraint
-- was created before these values were added to the app.
--
-- Run this in Supabase SQL Editor > New query > Run

-- Step 1: Drop the old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;

-- Step 2: Add updated constraint that includes all values the app saves
ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IN (
    'surgeon',
    'attending',
    'resident',
    'fellow',
    'trainee',
    'app',
    'student',
    'industry',
    'industry_non_clinical',
    'other'
  ));
