-- Fix the profiles table role check constraint
-- The constraint currently doesn't allow the new role values

-- First, check what the current constraint is
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
  AND conname = 'profiles_role_check';

-- Drop the old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Create a new constraint that allows all the role types
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('super_admin', 'specialty_admin', 'subspecialty_admin', 'user', 'admin'));

-- Now you can update your role
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'test@test.com'; -- Replace with your actual email

-- Verify the update worked
SELECT 
  email, 
  role,
  CASE 
    WHEN role = 'super_admin' THEN '✅ SuperAdmin - Full Access'
    WHEN role = 'specialty_admin' THEN '⚠️ Specialty Admin - Limited'
    WHEN role = 'subspecialty_admin' THEN '⚠️ SubAdmin - Limited'
    WHEN role = 'admin' THEN '⚠️ Legacy Admin - Update to super_admin'
    ELSE '❓ Unknown role: ' || COALESCE(role::text, 'NULL')
  END as status
FROM profiles 
WHERE email = 'test@test.com'; -- Replace with your actual email
