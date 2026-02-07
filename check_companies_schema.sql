-- Check the actual structure of the companies table
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'companies'
ORDER BY ordinal_position;

-- Check if there's a junction table linking companies to subspecialties
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%company%' OR table_name LIKE '%subspecialty%')
ORDER BY table_name;
