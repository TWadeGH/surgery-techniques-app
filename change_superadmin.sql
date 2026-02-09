-- =====================================================
-- Change Superadmin from test@test.com to traviswhansonmd@gmail.com
-- =====================================================
-- Run this in Supabase SQL Editor
-- This updates the profiles table to change the superadmin
-- =====================================================

BEGIN;

-- Step 1: Verify both users exist
DO $$
DECLARE
  old_user_id UUID;
  new_user_id UUID;
BEGIN
  -- Get old user ID (test@test.com)
  SELECT id INTO old_user_id
  FROM auth.users
  WHERE email = 'test@test.com';

  -- Get new user ID (traviswhansonmd@gmail.com)
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = 'traviswhansonmd@gmail.com';

  RAISE NOTICE 'Old user (test@test.com) ID: %', old_user_id;
  RAISE NOTICE 'New user (traviswhansonmd@gmail.com) ID: %', new_user_id;

  -- Verify both users exist
  IF old_user_id IS NULL THEN
    RAISE EXCEPTION 'User test@test.com not found';
  END IF;

  IF new_user_id IS NULL THEN
    RAISE EXCEPTION 'User traviswhansonmd@gmail.com not found';
  END IF;
END $$;

-- Step 2: Change test@test.com from super_admin to regular user
UPDATE profiles
SET role = 'user',
    primary_specialty_id = NULL,
    primary_subspecialty_id = NULL
WHERE id = (SELECT id FROM auth.users WHERE email = 'test@test.com')
  AND role = 'super_admin';

-- Step 3: Make traviswhansonmd@gmail.com a super_admin
UPDATE profiles
SET role = 'super_admin',
    primary_specialty_id = NULL,
    primary_subspecialty_id = NULL
WHERE id = (SELECT id FROM auth.users WHERE email = 'traviswhansonmd@gmail.com');

-- Step 4: Verify the change
SELECT
  u.email,
  p.role,
  p.primary_specialty_id,
  p.primary_subspecialty_id,
  p.created_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email IN ('test@test.com', 'traviswhansonmd@gmail.com')
ORDER BY u.email;

COMMIT;

-- =====================================================
-- Expected result:
-- traviswhansonmd@gmail.com should have role = 'super_admin'
-- test@test.com should have role = 'user'
-- =====================================================
