-- Check RLS policies on rep_inquiries table
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
WHERE tablename = 'rep_inquiries'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'rep_inquiries';
