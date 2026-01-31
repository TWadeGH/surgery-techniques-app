-- ============================================================================
-- COMPLETE SCHEMA FIX FOR resource_suggestions TABLE
-- ============================================================================
-- This adds ALL missing columns that the application expects.
-- Run this after the other migrations to ensure the table is complete.
-- ============================================================================

-- Add resource_type column (required - was missing)
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS resource_type TEXT DEFAULT 'video';

COMMENT ON COLUMN resource_suggestions.resource_type IS 'Type of resource: video, article, document, etc.';

-- Add image_url column (if not already added)
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN resource_suggestions.image_url IS 'URL of the image uploaded for this resource suggestion. Stored in Supabase storage bucket.';

-- Add keywords column (if not already added)
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS keywords TEXT;

COMMENT ON COLUMN resource_suggestions.keywords IS 'Comma-separated keywords for searchability';

-- Add category_id column (if not already added)
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

COMMENT ON COLUMN resource_suggestions.category_id IS 'Direct reference to the category this suggested resource belongs to.';

-- Add duration_seconds column (if not already added)
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

COMMENT ON COLUMN resource_suggestions.duration_seconds IS 'Video duration in seconds (only applicable for video resources)';

-- Add user_specialty_id column (if not already added)
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS user_specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL;

COMMENT ON COLUMN resource_suggestions.user_specialty_id IS 'Specialty of the user who suggested this resource. Used for filtering by specialty admins.';

-- Add user_subspecialty_id column (if not already added)
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS user_subspecialty_id UUID REFERENCES subspecialties(id) ON DELETE SET NULL;

COMMENT ON COLUMN resource_suggestions.user_subspecialty_id IS 'Subspecialty of the user who suggested this resource. Used for filtering by subspecialty admins.';

-- Add reviewed_by column (if not already added)
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN resource_suggestions.reviewed_by IS 'Admin who reviewed this suggestion.';

-- Add reviewed_at column (if not already added)
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

COMMENT ON COLUMN resource_suggestions.reviewed_at IS 'Timestamp when the suggestion was reviewed.';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_resource_suggestions_resource_type ON resource_suggestions(resource_type);
CREATE INDEX IF NOT EXISTS idx_resource_suggestions_image_url ON resource_suggestions(image_url) WHERE image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resource_suggestions_category_id ON resource_suggestions(category_id);
CREATE INDEX IF NOT EXISTS idx_resource_suggestions_user_specialty_id ON resource_suggestions(user_specialty_id);
CREATE INDEX IF NOT EXISTS idx_resource_suggestions_user_subspecialty_id ON resource_suggestions(user_subspecialty_id);
CREATE INDEX IF NOT EXISTS idx_resource_suggestions_status ON resource_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_resource_suggestions_reviewed_by ON resource_suggestions(reviewed_by);

-- ============================================================================
-- VERIFY ALL COLUMNS EXIST
-- ============================================================================
-- Run this query to verify all expected columns are present:
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'resource_suggestions' 
ORDER BY ordinal_position;

-- Expected columns:
-- - id (UUID, primary key)
-- - title (TEXT)
-- - url (TEXT)
-- - description (TEXT)
-- - resource_type (TEXT) ← This was missing!
-- - image_url (TEXT) ← This was missing!
-- - keywords (TEXT)
-- - suggested_by (UUID, references profiles)
-- - status (TEXT, default 'pending')
-- - category_id (UUID, references categories, nullable)
-- - duration_seconds (INTEGER, nullable)
-- - user_specialty_id (UUID, references specialties, nullable)
-- - user_subspecialty_id (UUID, references subspecialties, nullable)
-- - reviewed_by (UUID, references profiles, nullable)
-- - reviewed_at (TIMESTAMPTZ, nullable)
-- - created_at (TIMESTAMPTZ)
-- - updated_at (TIMESTAMPTZ)
