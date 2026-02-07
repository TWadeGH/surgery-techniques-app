-- Check RLS policies on subspecialty_companies table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'subspecialty_companies';

-- Also check if RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'subspecialty_companies';
