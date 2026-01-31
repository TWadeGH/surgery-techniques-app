-- ============================================================================
-- ADD image_url COLUMN TO resource_suggestions TABLE
-- ============================================================================
-- The resource_suggestions table needs an image_url column to store
-- the uploaded image URL for suggested resources.
-- ============================================================================

-- Add image_url column if it doesn't exist
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN resource_suggestions.image_url IS 'URL of the image uploaded for this resource suggestion. Stored in Supabase storage bucket.';

-- Create index for better query performance (optional, but helpful)
CREATE INDEX IF NOT EXISTS idx_resource_suggestions_image_url ON resource_suggestions(image_url) WHERE image_url IS NOT NULL;

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'resource_suggestions' 
  AND column_name = 'image_url';
