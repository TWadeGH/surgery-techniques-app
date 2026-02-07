-- Get the actual USING clause conditions for the SELECT policies
SELECT 
  tablename,
  policyname,
  cmd as operation,
  qual as using_condition
FROM pg_policies
WHERE tablename IN ('subspecialty_company_contacts', 'subspecialty_companies', 'subspecialties')
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;
