-- Check the schema of subspecialty_company_contacts
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'subspecialty_company_contacts'
ORDER BY ordinal_position;
