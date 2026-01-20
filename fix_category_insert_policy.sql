-- Fix Category INSERT Policy for SuperAdmin
-- This simplifies the check to directly query the role instead of using helper functions

-- First, let's check if the helper function is working
SELECT 
  email,
  role,
  CASE 
    WHEN role = 'super_admin' THEN '✅ SuperAdmin'
    WHEN role = 'specialty_admin' THEN '⚠️ Specialty Admin'
    WHEN role = 'subspecialty_admin' THEN '⚠️ SubAdmin'
    WHEN role = 'user' THEN '👤 User'
    ELSE '❓ Unknown role: ' || COALESCE(role::text, 'NULL')
  END as role_status,
  is_super_admin(id) as helper_function_result
FROM profiles 
WHERE email = 'test@test.com'; -- Replace with your email

-- If helper function returns false but role is 'super_admin', there's an issue
-- Let's drop and recreate the INSERT policy with a direct check

DROP POLICY IF EXISTS "Admins can insert categories in scope" ON categories;

-- New INSERT policy with direct role check
CREATE POLICY "Admins can insert categories in scope"
ON categories
FOR INSERT
TO authenticated
WITH CHECK (
  -- SuperAdmin: can insert anywhere (direct check)
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
  -- Specialty Admin: can insert if subspecialty belongs to their specialty
  OR (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'specialty_admin')
    AND subspecialty_id IN (
      SELECT s.id
      FROM subspecialties s
      JOIN profiles p ON s.specialty_id = p.primary_specialty_id
      WHERE p.id = auth.uid()
    )
  )
  -- SubAdmin: can insert if subspecialty matches theirs
  OR (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'subspecialty_admin')
    AND subspecialty_id IN (
      SELECT primary_subspecialty_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Also fix UPDATE and DELETE policies to use direct checks

DROP POLICY IF EXISTS "Admins can update categories in scope" ON categories;

CREATE POLICY "Admins can update categories in scope"
ON categories
FOR UPDATE
TO authenticated
USING (
  -- SuperAdmin: can update all
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
  -- Specialty Admin: can update categories within their specialty
  OR (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'specialty_admin')
    AND subspecialty_id IN (
      SELECT s.id
      FROM subspecialties s
      JOIN profiles p ON s.specialty_id = p.primary_specialty_id
      WHERE p.id = auth.uid()
    )
  )
  -- SubAdmin: can update categories within their subspecialty
  OR (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'subspecialty_admin')
    AND subspecialty_id IN (
      SELECT primary_subspecialty_id FROM profiles WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  -- Same checks for the new values
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
  OR (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'specialty_admin')
    AND subspecialty_id IN (
      SELECT s.id
      FROM subspecialties s
      JOIN profiles p ON s.specialty_id = p.primary_specialty_id
      WHERE p.id = auth.uid()
    )
  )
  OR (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'subspecialty_admin')
    AND subspecialty_id IN (
      SELECT primary_subspecialty_id FROM profiles WHERE id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Admins can delete categories in scope" ON categories;

CREATE POLICY "Admins can delete categories in scope"
ON categories
FOR DELETE
TO authenticated
USING (
  -- SuperAdmin: can delete all
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
  -- Specialty Admin: can delete categories within their specialty
  OR (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'specialty_admin')
    AND subspecialty_id IN (
      SELECT s.id
      FROM subspecialties s
      JOIN profiles p ON s.specialty_id = p.primary_specialty_id
      WHERE p.id = auth.uid()
    )
  )
  -- SubAdmin: can delete categories within their subspecialty
  OR (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'subspecialty_admin')
    AND subspecialty_id IN (
      SELECT primary_subspecialty_id FROM profiles WHERE id = auth.uid()
    )
  )
);
