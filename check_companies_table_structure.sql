-- Check the structure of the companies table
-- to see if it has subspecialty_id column

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'companies'
ORDER BY ordinal_position;

-- Check all companies (including subspecialty if it exists)
SELECT 
  id,
  name,
  subspecialty_id,
  is_active,
  created_at
FROM companies
ORDER BY name;
