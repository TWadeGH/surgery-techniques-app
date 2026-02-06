-- Add company_name, product_name, and year_of_publication to resources tables
-- These fields enable Rep Platform and better resource attribution

-- Add columns to resources table
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS year_of_publication INTEGER;

-- Add columns to resource_suggestions table
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS year_of_publication INTEGER;

-- Add constraints for year_of_publication (must be reasonable)
ALTER TABLE resources
ADD CONSTRAINT resources_year_check CHECK (year_of_publication IS NULL OR (year_of_publication >= 1900 AND year_of_publication <= 2100));

ALTER TABLE resource_suggestions
ADD CONSTRAINT suggestions_year_check CHECK (year_of_publication IS NULL OR (year_of_publication >= 1900 AND year_of_publication <= 2100));

-- Create index for faster company lookups
CREATE INDEX IF NOT EXISTS idx_resources_company_name ON resources(company_name) WHERE company_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resources_year ON resources(year_of_publication) WHERE year_of_publication IS NOT NULL;

-- Update trigger to auto-populate subspecialty_companies when resource has company_name
CREATE OR REPLACE FUNCTION auto_populate_subspecialty_companies()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if company_name is not null and category is set
  IF NEW.company_name IS NOT NULL AND NEW.company_name != '' AND NEW.category_id IS NOT NULL THEN
    DECLARE
      v_subspecialty_id UUID;
    BEGIN
      -- Get subspecialty_id from category
      SELECT subspecialty_id INTO v_subspecialty_id
      FROM categories
      WHERE id = NEW.category_id;

      -- Insert into subspecialty_companies if not exists
      IF v_subspecialty_id IS NOT NULL THEN
        INSERT INTO subspecialty_companies (subspecialty_id, company_name)
        VALUES (v_subspecialty_id, NEW.company_name)
        ON CONFLICT (subspecialty_id, company_name) DO NOTHING;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on resources table
DROP TRIGGER IF EXISTS trigger_auto_populate_companies ON resources;
CREATE TRIGGER trigger_auto_populate_companies
  AFTER INSERT OR UPDATE OF company_name, category_id ON resources
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_subspecialty_companies();

-- Backfill subspecialty_companies with existing data
INSERT INTO subspecialty_companies (subspecialty_id, company_name)
SELECT DISTINCT c.subspecialty_id, r.company_name
FROM resources r
INNER JOIN categories c ON r.category_id = c.id
WHERE r.company_name IS NOT NULL
  AND r.company_name != ''
  AND c.subspecialty_id IS NOT NULL
ON CONFLICT (subspecialty_id, company_name) DO NOTHING;

-- Verify changes
SELECT 'Added columns successfully' as status;
