-- Fix: Add INSERT policy for profiles table
-- This allows new users to create their own profile during signup

-- Drop existing INSERT policy if any
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- INSERT: Users can insert their own profile (for new signups)
CREATE POLICY "Users can insert their own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
