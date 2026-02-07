-- Get full policy definitions for rep_inquiries INSERT policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  CASE WHEN qual IS NOT NULL THEN pg_get_expr(qual, 'rep_inquiries'::regclass) ELSE 'No USING clause' END as using_clause,
  CASE WHEN with_check IS NOT NULL THEN pg_get_expr(with_check, 'rep_inquiries'::regclass) ELSE 'No WITH CHECK clause' END as with_check_clause
FROM pg_policies
WHERE tablename = 'rep_inquiries'
  AND cmd = 'INSERT'
ORDER BY policyname;
