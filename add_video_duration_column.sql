-- Add duration column for video resources
-- Duration will be stored in seconds (integer)

-- Add the duration column if it doesn't exist
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Add a comment to document the column
COMMENT ON COLUMN resources.duration_seconds IS 'Video duration in seconds (only applicable for video resources)';

-- Add the duration column to resource_suggestions table as well
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'resource_suggestions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'resource_suggestions' 
        AND column_name = 'duration_seconds'
    ) THEN
      ALTER TABLE resource_suggestions ADD COLUMN duration_seconds INTEGER;
      COMMENT ON COLUMN resource_suggestions.duration_seconds IS 'Video duration in seconds (only applicable for video resources)';
    END IF;
  END IF;
END $$;
