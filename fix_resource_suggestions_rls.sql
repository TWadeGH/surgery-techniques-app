-- ============================================================================
-- FIX RLS POLICIES FOR RESOURCE SUGGESTIONS
-- ============================================================================
-- This fixes two issues:
-- 1. Storage bucket: Allow authenticated users to upload suggestion images
-- 2. Resource suggestions: Ensure INSERT policy works with category_id (not just procedure_id)
-- ============================================================================

-- ============================================================================
-- 1. STORAGE BUCKET: Allow users to upload suggestion images
-- ============================================================================
-- Add policy to allow authenticated users to upload to resource-images/ folder
-- (for suggestions only - admins can upload anywhere in the bucket)

DROP POLICY IF EXISTS "Users can upload suggestion images" ON storage.objects;

CREATE POLICY "Users can upload suggestion images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resources'
  AND name LIKE 'resource-images/%'
);

-- ============================================================================
-- 2. RESOURCE_SUGGESTIONS: Fix INSERT policy to work with category_id
-- ============================================================================
-- The current policy should work, but let's make sure it's correct
-- Users should be able to insert suggestions with their user_id as suggested_by

-- Drop and recreate the INSERT policy to ensure it's correct
DROP POLICY IF EXISTS "Users can insert their own suggestions" ON resource_suggestions;

CREATE POLICY "Users can insert their own suggestions"
ON resource_suggestions
FOR INSERT
TO authenticated
WITH CHECK (
  suggested_by = auth.uid()
);

-- ============================================================================
-- 3. RESOURCE_SUGGESTIONS: Update SELECT policy to work with category_id
-- ============================================================================
-- The current SELECT policy uses procedure_id, but suggestions might use category_id
-- Update it to handle both category_id and user_specialty_id/user_subspecialty_id

DROP POLICY IF EXISTS "Admins can view suggestions in scope" ON resource_suggestions;

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
    AND (
      -- Check via procedure_id (old way)
      procedure_id IN (
        SELECT pr.id
        FROM procedures pr
        JOIN categories c ON pr.category_id = c.id
        JOIN subspecialties s ON c.subspecialty_id = s.id
        WHERE s.specialty_id = get_user_specialty_id(auth.uid())
      )
      -- OR check via category_id (new way)
      OR category_id IN (
        SELECT c.id
        FROM categories c
        JOIN subspecialties s ON c.subspecialty_id = s.id
        WHERE s.specialty_id = get_user_specialty_id(auth.uid())
      )
      -- OR check via user_specialty_id (newest way)
      OR user_specialty_id = get_user_specialty_id(auth.uid())
    )
  )
  -- SubAdmin: can view suggestions within their subspecialty
  OR (
    is_subspecialty_admin(auth.uid())
    AND (
      -- Check via procedure_id (old way)
      procedure_id IN (
        SELECT pr.id
        FROM procedures pr
        JOIN categories c ON pr.category_id = c.id
        WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
      )
      -- OR check via category_id (new way)
      OR category_id IN (
        SELECT c.id
        FROM categories c
        WHERE c.subspecialty_id = get_user_subspecialty_id(auth.uid())
      )
      -- OR check via user_subspecialty_id (newest way)
      OR user_subspecialty_id = get_user_subspecialty_id(auth.uid())
    )
  )
  -- Users can view their own suggestions
  OR suggested_by = auth.uid()
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this, test by:
-- 1. Logging in as a regular user (not admin)
-- 2. Trying to suggest a resource with an image
-- 3. It should work now!
