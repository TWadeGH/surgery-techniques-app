-- ============================================================================
-- MAKE procedure_id NULLABLE IN resource_suggestions TABLE
-- ============================================================================
-- The table has a NOT NULL constraint on procedure_id, but the application
-- now uses category_id instead. We need to make procedure_id nullable
-- so suggestions can be created without it.
-- ============================================================================

-- Make procedure_id nullable
ALTER TABLE resource_suggestions
ALTER COLUMN procedure_id DROP NOT NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN resource_suggestions.procedure_id IS 'Legacy column - kept for backward compatibility. New suggestions use category_id instead.';

-- Verify the change
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'resource_suggestions' 
  AND column_name = 'procedure_id';

-- Should show is_nullable = 'YES'
