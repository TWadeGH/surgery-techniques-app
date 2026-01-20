-- ============================================================================
-- COMPREHENSIVE RLS POLICIES FOR SURGICAL TECHNIQUES APP
-- ============================================================================
-- This file contains all Row Level Security (RLS) policies needed for the app.
-- Run this in your Supabase SQL Editor to set up all policies at once.
--
-- ROLE STRUCTURE:
-- - super_admin: Full access to everything (you)
-- - specialty_admin: Can manage everything within their specialty (via primary_specialty_id)
-- - subspecialty_admin: Can manage everything within their subspecialty (via primary_subspecialty_id)
-- - user: Can view resources for their subspecialty, manage own favorites/notes, suggest resources
--
-- IMPORTANT: Make sure RLS is enabled on all tables first:
--   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS FOR ROLE CHECKING
-- ============================================================================

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND role = 'super_admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if user is specialty admin
CREATE OR REPLACE FUNCTION is_specialty_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND role = 'specialty_admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if user is subspecialty admin
CREATE OR REPLACE FUNCTION is_subspecialty_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND role = 'subspecialty_admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if user is any admin type
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND role IN ('super_admin', 'specialty_admin', 'subspecialty_admin')
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to get user's specialty_id (for specialty_admin)
CREATE OR REPLACE FUNCTION get_user_specialty_id(user_id UUID)
RETURNS UUID AS $$
  SELECT primary_specialty_id FROM profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to get user's subspecialty_id (for subspecialty_admin)
CREATE OR REPLACE FUNCTION get_user_subspecialty_id(user_id UUID)
RETURNS UUID AS $$
  SELECT primary_subspecialty_id FROM profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if a subspecialty_id belongs to user's specialty
CREATE OR REPLACE FUNCTION subspecialty_belongs_to_user_specialty(
  user_id UUID, 
  subspecialty_id_to_check UUID
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM subspecialties s
    JOIN profiles p ON s.specialty_id = p.primary_specialty_id
    WHERE p.id = user_id 
    AND s.id = subspecialty_id_to_check
    AND p.role = 'specialty_admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- 1. RESOURCES TABLE
-- ============================================================================
-- Users can view resources for their subspecialty
-- SuperAdmin: Can manage all resources
-- Specialty Admin: Can manage resources within their specialty
-- SubAdmin: Can manage resources within their subspecialty

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their subspecialty resources" ON resources;
DROP POLICY IF EXISTS "Admins can view resources in scope" ON resources;
DROP POLICY IF EXISTS "Admins can insert resources in scope" ON resources;
DROP POLICY IF EXISTS "Admins can update resources in scope" ON resources;
DROP POLICY IF EXISTS "Admins can delete resources in scope" ON resources;

-- SELECT: Users can view resources for their subspecialty, admins can view resources in their scope
CREATE POLICY "Users can view their subspecialty resources"
ON resources
FOR SELECT
TO authenticated
USING (
  -- Regular users: can view resources for their subspecialty
  (
    NOT is_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      JOIN profiles p ON c.subspecialty_id = p.primary_subspecialty_id
      WHERE p.id = auth.uid()
    )
  )
  -- SuperAdmin: can view all
  OR is_super_admin(auth.uid())
  -- Specialty Admin: can view resources within their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      JOIN subspecialties s ON c.subspecialty_id = s.id
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  -- SubAdmin: can view resources within their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
);

-- INSERT: Admins can insert resources within their scope
CREATE POLICY "Admins can insert resources in scope"
ON resources
FOR INSERT
TO authenticated
WITH CHECK (
  -- SuperAdmin: can insert anywhere
  is_super_admin(auth.uid())
  -- Specialty Admin: can insert if procedure belongs to their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      JOIN subspecialties s ON c.subspecialty_id = s.id
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  -- SubAdmin: can insert if procedure belongs to their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
);

-- UPDATE: Admins can update resources within their scope
CREATE POLICY "Admins can update resources in scope"
ON resources
FOR UPDATE
TO authenticated
USING (
  -- SuperAdmin: can update all
  is_super_admin(auth.uid())
  -- Specialty Admin: can update resources within their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      JOIN subspecialties s ON c.subspecialty_id = s.id
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  -- SubAdmin: can update resources within their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
)
WITH CHECK (
  -- Same checks for the new values
  is_super_admin(auth.uid())
  OR (
    is_specialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      JOIN subspecialties s ON c.subspecialty_id = s.id
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  OR (
    is_subspecialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
);

-- DELETE: Admins can delete resources within their scope
CREATE POLICY "Admins can delete resources in scope"
ON resources
FOR DELETE
TO authenticated
USING (
  -- SuperAdmin: can delete all
  is_super_admin(auth.uid())
  -- Specialty Admin: can delete resources within their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      JOIN subspecialties s ON c.subspecialty_id = s.id
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  -- SubAdmin: can delete resources within their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
);

-- ============================================================================
-- 2. CATEGORIES TABLE
-- ============================================================================
-- Users can view categories for their subspecialty
-- SuperAdmin: Can manage all categories
-- Specialty Admin: Can manage categories within their specialty
-- SubAdmin: Can manage categories within their subspecialty

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their subspecialty categories" ON categories;
DROP POLICY IF EXISTS "Admins can insert categories in scope" ON categories;
DROP POLICY IF EXISTS "Admins can update categories in scope" ON categories;
DROP POLICY IF EXISTS "Admins can delete categories in scope" ON categories;

-- SELECT: Users can view categories for their subspecialty, admins can view categories in their scope
CREATE POLICY "Users can view their subspecialty categories"
ON categories
FOR SELECT
TO authenticated
USING (
  -- Regular users: can view categories for their subspecialty
  (
    NOT is_admin(auth.uid())
    AND subspecialty_id IN (
      SELECT primary_subspecialty_id FROM profiles WHERE id = auth.uid()
    )
  )
  -- SuperAdmin: can view all
  OR is_super_admin(auth.uid())
  -- Specialty Admin: can view categories within their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND subspecialty_id IN (
      SELECT s.id
      FROM subspecialties s
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  -- SubAdmin: can view categories within their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND subspecialty_id = get_user_subspecialty_id(auth.uid())
  )
);

-- INSERT: Admins can insert categories within their scope
CREATE POLICY "Admins can insert categories in scope"
ON categories
FOR INSERT
TO authenticated
WITH CHECK (
  -- SuperAdmin: can insert anywhere
  is_super_admin(auth.uid())
  -- Specialty Admin: can insert if subspecialty belongs to their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND subspecialty_belongs_to_user_specialty(auth.uid(), subspecialty_id)
  )
  -- SubAdmin: can insert if subspecialty matches theirs
  OR (
    is_subspecialty_admin(auth.uid())
    AND subspecialty_id = get_user_subspecialty_id(auth.uid())
  )
);

-- UPDATE: Admins can update categories within their scope
CREATE POLICY "Admins can update categories in scope"
ON categories
FOR UPDATE
TO authenticated
USING (
  -- SuperAdmin: can update all
  is_super_admin(auth.uid())
  -- Specialty Admin: can update categories within their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND subspecialty_belongs_to_user_specialty(auth.uid(), subspecialty_id)
  )
  -- SubAdmin: can update categories within their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND subspecialty_id = get_user_subspecialty_id(auth.uid())
  )
)
WITH CHECK (
  -- Same checks for the new values
  is_super_admin(auth.uid())
  OR (
    is_specialty_admin(auth.uid())
    AND subspecialty_belongs_to_user_specialty(auth.uid(), subspecialty_id)
  )
  OR (
    is_subspecialty_admin(auth.uid())
    AND subspecialty_id = get_user_subspecialty_id(auth.uid())
  )
);

-- DELETE: Admins can delete categories within their scope
CREATE POLICY "Admins can delete categories in scope"
ON categories
FOR DELETE
TO authenticated
USING (
  -- SuperAdmin: can delete all
  is_super_admin(auth.uid())
  -- Specialty Admin: can delete categories within their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND subspecialty_belongs_to_user_specialty(auth.uid(), subspecialty_id)
  )
  -- SubAdmin: can delete categories within their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND subspecialty_id = get_user_subspecialty_id(auth.uid())
  )
);

-- ============================================================================
-- 3. RESOURCE_SUGGESTIONS TABLE
-- ============================================================================
-- Users can insert their own suggestions
-- SuperAdmin: Can view and manage all suggestions
-- Specialty Admin: Can view and manage suggestions within their specialty
-- SubAdmin: Can view and manage suggestions within their subspecialty

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own suggestions" ON resource_suggestions;
DROP POLICY IF EXISTS "Admins can view suggestions in scope" ON resource_suggestions;
DROP POLICY IF EXISTS "Admins can update suggestions in scope" ON resource_suggestions;
DROP POLICY IF EXISTS "Admins can delete suggestions in scope" ON resource_suggestions;

-- SELECT: Admins can view suggestions within their scope
CREATE POLICY "Admins can view suggestions in scope"
ON resource_suggestions
FOR SELECT
TO authenticated
USING (
  -- SuperAdmin: can view all
  is_super_admin(auth.uid())
  -- Specialty Admin: can view suggestions within their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      JOIN subspecialties s ON c.subspecialty_id = s.id
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  -- SubAdmin: can view suggestions within their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
  -- Users can view their own suggestions
  OR suggested_by = auth.uid()
);

-- INSERT: Users can insert their own suggestions
CREATE POLICY "Users can insert their own suggestions"
ON resource_suggestions
FOR INSERT
TO authenticated
WITH CHECK (suggested_by = auth.uid());

-- UPDATE: Admins can update suggestions within their scope
CREATE POLICY "Admins can update suggestions in scope"
ON resource_suggestions
FOR UPDATE
TO authenticated
USING (
  -- SuperAdmin: can update all
  is_super_admin(auth.uid())
  -- Specialty Admin: can update suggestions within their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      JOIN subspecialties s ON c.subspecialty_id = s.id
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  -- SubAdmin: can update suggestions within their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
)
WITH CHECK (
  -- Same checks for the new values
  is_super_admin(auth.uid())
  OR (
    is_specialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      JOIN subspecialties s ON c.subspecialty_id = s.id
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  OR (
    is_subspecialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
);

-- DELETE: Admins can delete suggestions within their scope
CREATE POLICY "Admins can delete suggestions in scope"
ON resource_suggestions
FOR DELETE
TO authenticated
USING (
  -- SuperAdmin: can delete all
  is_super_admin(auth.uid())
  -- Specialty Admin: can delete suggestions within their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      JOIN subspecialties s ON c.subspecialty_id = s.id
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  -- SubAdmin: can delete suggestions within their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND procedure_id IN (
      SELECT pr.id
      FROM procedures pr
      JOIN categories c ON pr.category_id = c.id
      WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
);

-- ============================================================================
-- 4. FAVORITES TABLE
-- ============================================================================
-- Users can manage their own favorites (unchanged)

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can insert their own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON favorites;

-- SELECT: Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON favorites
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Users can insert their own favorites
CREATE POLICY "Users can insert their own favorites"
ON favorites
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites"
ON favorites
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- 5. NOTES TABLE
-- ============================================================================
-- Users can manage their own notes (unchanged)

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;

-- SELECT: Users can view their own notes
CREATE POLICY "Users can view their own notes"
ON notes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Users can insert their own notes
CREATE POLICY "Users can insert their own notes"
ON notes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update their own notes
CREATE POLICY "Users can update their own notes"
ON notes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own notes
CREATE POLICY "Users can delete their own notes"
ON notes
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- 6. PROFILES TABLE
-- ============================================================================
-- Users can view and update their own profile (except role)
-- SuperAdmin: Can view and update all profiles
-- Specialty Admin: Can view profiles in their specialty
-- SubAdmin: Can view profiles in their subspecialty

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view profiles in scope" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles in scope" ON profiles;

-- SELECT: Users can view their own profile, admins can view profiles in their scope
CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  -- SuperAdmin: can view all
  OR is_super_admin(auth.uid())
  -- Specialty Admin: can view profiles in their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND primary_specialty_id = get_user_specialty_id(auth.uid())
  )
  -- SubAdmin: can view profiles in their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND primary_subspecialty_id = get_user_subspecialty_id(auth.uid())
  )
);

-- UPDATE: Users can update their own profile (except role), SuperAdmin can update all
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() 
  AND (role IS NULL OR role = (SELECT role FROM profiles WHERE id = auth.uid()))
);

-- UPDATE: SuperAdmin can update any profile
CREATE POLICY "Admins can update profiles in scope"
ON profiles
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- ============================================================================
-- 7. PROCEDURES TABLE
-- ============================================================================
-- Users can view procedures for their subspecialty
-- SuperAdmin: Can manage all procedures
-- Specialty Admin: Can manage procedures within their specialty
-- SubAdmin: Can manage procedures within their subspecialty

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their subspecialty procedures" ON procedures;
DROP POLICY IF EXISTS "Admins can insert procedures in scope" ON procedures;
DROP POLICY IF EXISTS "Admins can update procedures in scope" ON procedures;
DROP POLICY IF EXISTS "Admins can delete procedures in scope" ON procedures;

-- SELECT: Users can view procedures for their subspecialty, admins can view procedures in their scope
CREATE POLICY "Users can view their subspecialty procedures"
ON procedures
FOR SELECT
TO authenticated
USING (
  -- Regular users: can view procedures for their subspecialty
  (
    NOT is_admin(auth.uid())
    AND category_id IN (
      SELECT c.id
      FROM categories c
      JOIN profiles p ON c.subspecialty_id = p.primary_subspecialty_id
      WHERE p.id = auth.uid()
    )
  )
  -- SuperAdmin: can view all
  OR is_super_admin(auth.uid())
  -- Specialty Admin: can view procedures within their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND category_id IN (
      SELECT c.id
      FROM categories c
      JOIN subspecialties s ON c.subspecialty_id = s.id
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  -- SubAdmin: can view procedures within their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND category_id IN (
      SELECT c.id
      FROM categories c
      WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
);

-- INSERT: Admins can insert procedures within their scope
CREATE POLICY "Admins can insert procedures in scope"
ON procedures
FOR INSERT
TO authenticated
WITH CHECK (
  -- SuperAdmin: can insert anywhere
  is_super_admin(auth.uid())
  -- Specialty Admin: can insert if category belongs to their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND category_id IN (
      SELECT c.id
      FROM categories c
      JOIN subspecialties s ON c.subspecialty_id = s.id
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  -- SubAdmin: can insert if category belongs to their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND category_id IN (
      SELECT c.id
      FROM categories c
      WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
);

-- UPDATE: Admins can update procedures within their scope
CREATE POLICY "Admins can update procedures in scope"
ON procedures
FOR UPDATE
TO authenticated
USING (
  -- SuperAdmin: can update all
  is_super_admin(auth.uid())
  -- Specialty Admin: can update procedures within their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND category_id IN (
      SELECT c.id
      FROM categories c
      JOIN subspecialties s ON c.subspecialty_id = s.id
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  -- SubAdmin: can update procedures within their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND category_id IN (
      SELECT c.id
      FROM categories c
      WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
)
WITH CHECK (
  -- Same checks for the new values
  is_super_admin(auth.uid())
  OR (
    is_specialty_admin(auth.uid())
    AND category_id IN (
      SELECT c.id
      FROM categories c
      JOIN subspecialties s ON c.subspecialty_id = s.id
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  OR (
    is_subspecialty_admin(auth.uid())
    AND category_id IN (
      SELECT c.id
      FROM categories c
      WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
);

-- DELETE: Admins can delete procedures within their scope
CREATE POLICY "Admins can delete procedures in scope"
ON procedures
FOR DELETE
TO authenticated
USING (
  -- SuperAdmin: can delete all
  is_super_admin(auth.uid())
  -- Specialty Admin: can delete procedures within their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND category_id IN (
      SELECT c.id
      FROM categories c
      JOIN subspecialties s ON c.subspecialty_id = s.id
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  -- SubAdmin: can delete procedures within their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND category_id IN (
      SELECT c.id
      FROM categories c
      WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
);

-- ============================================================================
-- 8. RESOURCE_VIEWS TABLE (Analytics)
-- ============================================================================
-- Users can insert their own view events
-- SuperAdmin: Can view all analytics
-- Specialty Admin: Can view analytics for their specialty
-- SubAdmin: Can view analytics for their subspecialty

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own views" ON resource_views;
DROP POLICY IF EXISTS "Admins can view views in scope" ON resource_views;

-- SELECT: Admins can view analytics within their scope
CREATE POLICY "Admins can view views in scope"
ON resource_views
FOR SELECT
TO authenticated
USING (
  -- SuperAdmin: can view all
  is_super_admin(auth.uid())
  -- Specialty Admin: can view analytics for their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND resource_id IN (
      SELECT r.id
      FROM resources r
      JOIN procedures pr ON r.procedure_id = pr.id
      JOIN categories c ON pr.category_id = c.id
      JOIN subspecialties s ON c.subspecialty_id = s.id
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  -- SubAdmin: can view analytics for their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND resource_id IN (
      SELECT r.id
      FROM resources r
      JOIN procedures pr ON r.procedure_id = pr.id
      JOIN categories c ON pr.category_id = c.id
      WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
);

-- INSERT: Users can insert their own view events
CREATE POLICY "Users can insert their own views"
ON resource_views
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 9. FAVORITE_EVENTS TABLE (Analytics)
-- ============================================================================
-- Users can insert their own favorite events
-- SuperAdmin: Can view all analytics
-- Specialty Admin: Can view analytics for their specialty
-- SubAdmin: Can view analytics for their subspecialty

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own favorite events" ON favorite_events;
DROP POLICY IF EXISTS "Admins can view favorite events in scope" ON favorite_events;

-- SELECT: Admins can view analytics within their scope
CREATE POLICY "Admins can view favorite events in scope"
ON favorite_events
FOR SELECT
TO authenticated
USING (
  -- SuperAdmin: can view all
  is_super_admin(auth.uid())
  -- Specialty Admin: can view analytics for their specialty
  OR (
    is_specialty_admin(auth.uid())
    AND resource_id IN (
      SELECT r.id
      FROM resources r
      JOIN procedures pr ON r.procedure_id = pr.id
      JOIN categories c ON pr.category_id = c.id
      JOIN subspecialties s ON c.subspecialty_id = s.id
      WHERE s.specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  -- SubAdmin: can view analytics for their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND resource_id IN (
      SELECT r.id
      FROM resources r
      JOIN procedures pr ON r.procedure_id = pr.id
      JOIN categories c ON pr.category_id = c.id
      WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
);

-- INSERT: Users can insert their own favorite events
CREATE POLICY "Users can insert their own favorite events"
ON favorite_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 10. SPECIALTIES TABLE (Read-only for all)
-- ============================================================================
-- All authenticated users can view specialties

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view specialties" ON specialties;

-- SELECT: All authenticated users can view
CREATE POLICY "Anyone can view specialties"
ON specialties
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- 11. SUBSPECIALTIES TABLE (Read-only for all)
-- ============================================================================
-- All authenticated users can view subspecialties

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view subspecialties" ON subspecialties;

-- SELECT: All authenticated users can view
CREATE POLICY "Anyone can view subspecialties"
ON subspecialties
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- 12. STORAGE BUCKET POLICIES (resources bucket)
-- ============================================================================
-- Admins can upload/update/delete within their scope, all authenticated users can read

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can read resources bucket files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload to resources bucket in scope" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update resources bucket files in scope" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete resources bucket files in scope" ON storage.objects;

-- SELECT: All authenticated users can read files
CREATE POLICY "Anyone can read resources bucket files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'resources');

-- INSERT: Admins can upload (scope enforced by app logic, not storage level)
CREATE POLICY "Admins can upload to resources bucket in scope"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resources'
  AND is_admin(auth.uid())
);

-- UPDATE: Admins can update (scope enforced by app logic, not storage level)
CREATE POLICY "Admins can update resources bucket files in scope"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resources'
  AND is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'resources'
  AND is_admin(auth.uid())
);

-- DELETE: Admins can delete (scope enforced by app logic, not storage level)
CREATE POLICY "Admins can delete resources bucket files in scope"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resources'
  AND is_admin(auth.uid())
);

-- ============================================================================
-- END OF COMPREHENSIVE RLS POLICIES
-- ============================================================================
-- 
-- After running this script, verify RLS is enabled on all tables:
-- 
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename;
--
-- If any table shows rowsecurity = false, enable it:
-- ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
--
-- To set roles in profiles table:
-- UPDATE profiles SET role = 'super_admin' WHERE email = 'your@email.com';
-- UPDATE profiles SET role = 'specialty_admin' WHERE email = 'admin@email.com';
-- UPDATE profiles SET role = 'subspecialty_admin' WHERE email = 'subadmin@email.com';
-- ============================================================================
