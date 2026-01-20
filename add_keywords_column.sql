-- Add keywords column to resources and resource_suggestions tables

-- ============================================================================
-- 1. Add keywords to resources table
-- ============================================================================

-- Check if the column already exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'resources' 
  AND column_name = 'keywords';

-- Add the keywords column if it doesn't exist
-- Using TEXT type to allow for comma-separated keywords
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS keywords TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN resources.keywords IS 'Comma-separated keywords for searchability (e.g., "bunion, MIS, osteotomy")';

-- ============================================================================
-- 2. Add keywords to resource_suggestions table (if it exists)
-- ============================================================================

-- Check if resource_suggestions table exists and if it has keywords column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'resource_suggestions' 
  AND column_name = 'keywords';

-- Add the keywords column if the table exists and column doesn't
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'resource_suggestions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'resource_suggestions' 
        AND column_name = 'keywords'
    ) THEN
      ALTER TABLE resource_suggestions ADD COLUMN keywords TEXT;
      COMMENT ON COLUMN resource_suggestions.keywords IS 'Comma-separated keywords for searchability';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 3. Verify both columns were added
-- ============================================================================

SELECT 
  table_name,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('resources', 'resource_suggestions')
  AND column_name = 'keywords'
ORDER BY table_name;
