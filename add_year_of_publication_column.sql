-- Add year_of_publication column to resources table
-- This column stores the year a resource was published or created (optional)

ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS year_of_publication INTEGER;

COMMENT ON COLUMN resources.year_of_publication IS 'Year the resource was published or created (optional)';

-- Add a check constraint to ensure reasonable year values (if provided)
ALTER TABLE resources 
ADD CONSTRAINT year_of_publication_reasonable_range 
CHECK (year_of_publication IS NULL OR (year_of_publication >= 1900 AND year_of_publication <= 2100));
